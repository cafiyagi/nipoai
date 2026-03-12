import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getStripe } from "@/lib/stripe/client";
import { getPlanByStripePriceId } from "@/lib/stripe/plans";
import { createAdminClient } from "@/lib/supabase/admin";
import type Stripe from "stripe";
import type {
  Plan,
  SubscriptionStatus,
  WorkspaceUpdate,
  SubscriptionInsert,
  SubscriptionUpdate,
  Subscription,
} from "@/lib/supabase/types";

function getSubscriptionPeriod(subscription: Stripe.Subscription): {
  start: number;
  end: number;
} | null {
  // In Stripe v20+ (2026-02-25.clover), current_period is on subscription items
  const item = subscription.items?.data?.[0];
  if (!item?.current_period_start || !item?.current_period_end) {
    return null;
  }
  return {
    start: item.current_period_start,
    end: item.current_period_end,
  };
}

export async function POST(request: Request) {
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 },
    );
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET is not set");
    return NextResponse.json(
      { error: "Webhook not configured" },
      { status: 500 },
    );
  }

  let event: Stripe.Event;

  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error(
      "Stripe webhook signature verification failed:",
      err instanceof Error ? err.message : err,
    );
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 },
    );
  }

  const admin = createAdminClient();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const workspaceId = session.metadata?.workspace_id;
        const stripeSubscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription?.id;
        const stripeCustomerId =
          typeof session.customer === "string"
            ? session.customer
            : session.customer?.id;

        if (!workspaceId || !stripeSubscriptionId || !stripeCustomerId) {
          console.error("Missing metadata in checkout session:", session.id);
          break;
        }

        // Retrieve the subscription to get the plan
        const stripe = getStripe();
        const subscription = await stripe.subscriptions.retrieve(
          stripeSubscriptionId,
        );
        const priceId = subscription.items.data[0]?.price?.id;
        const plan = priceId ? getPlanByStripePriceId(priceId) : null;

        if (!plan) {
          console.error("Unknown price ID:", priceId);
          break;
        }

        const period = getSubscriptionPeriod(subscription);

        // Update workspace with Stripe IDs and plan
        const wsUpdate: WorkspaceUpdate = {
          plan,
          stripe_customer_id: stripeCustomerId,
          stripe_subscription_id: stripeSubscriptionId,
        };
        await admin
          .from("workspaces")
          .update(wsUpdate as never)
          .eq("id", workspaceId);

        // Upsert subscription record
        const subRow: SubscriptionInsert = {
          workspace_id: workspaceId,
          stripe_subscription_id: stripeSubscriptionId,
          plan,
          status: mapStripeStatus(subscription.status),
          current_period_start: period
            ? new Date(period.start * 1000).toISOString()
            : null,
          current_period_end: period
            ? new Date(period.end * 1000).toISOString()
            : null,
        };
        await admin
          .from("subscriptions")
          .upsert(subRow as never, {
            onConflict: "stripe_subscription_id",
          });

        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const stripeSubscriptionId = subscription.id;
        const priceId = subscription.items.data[0]?.price?.id;
        const plan = priceId ? getPlanByStripePriceId(priceId) : null;
        const period = getSubscriptionPeriod(subscription);

        const subUpdate: SubscriptionUpdate = {
          status: mapStripeStatus(subscription.status),
          ...(period && {
            current_period_start: new Date(
              period.start * 1000,
            ).toISOString(),
            current_period_end: new Date(period.end * 1000).toISOString(),
          }),
        };

        if (plan) {
          subUpdate.plan = plan;
        }

        if (subscription.canceled_at) {
          subUpdate.canceled_at = new Date(
            subscription.canceled_at * 1000,
          ).toISOString();
        }

        const { data: rawExistingSub } = await admin
          .from("subscriptions")
          .select("workspace_id")
          .eq("stripe_subscription_id", stripeSubscriptionId)
          .single();

        const existingSub = rawExistingSub as Pick<
          Subscription,
          "workspace_id"
        > | null;

        if (existingSub) {
          await admin
            .from("subscriptions")
            .update(subUpdate as never)
            .eq("stripe_subscription_id", stripeSubscriptionId);

          if (plan) {
            const wsUpdate: WorkspaceUpdate = { plan };
            await admin
              .from("workspaces")
              .update(wsUpdate as never)
              .eq("id", existingSub.workspace_id);
          }
        }

        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const stripeSubscriptionId = subscription.id;

        const { data: rawExistingSub } = await admin
          .from("subscriptions")
          .select("workspace_id")
          .eq("stripe_subscription_id", stripeSubscriptionId)
          .single();

        const existingSub = rawExistingSub as Pick<
          Subscription,
          "workspace_id"
        > | null;

        if (existingSub) {
          const subUpdate: SubscriptionUpdate = {
            status: "canceled" as SubscriptionStatus,
            canceled_at: new Date().toISOString(),
          };
          await admin
            .from("subscriptions")
            .update(subUpdate as never)
            .eq("stripe_subscription_id", stripeSubscriptionId);

          const wsUpdate: WorkspaceUpdate = {
            plan: "free" as Plan,
            stripe_subscription_id: null,
          };
          await admin
            .from("workspaces")
            .update(wsUpdate as never)
            .eq("id", existingSub.workspace_id);
        }

        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const parentSub = invoice.parent?.subscription_details?.subscription;
        const subscriptionId =
          typeof parentSub === "string" ? parentSub : parentSub?.id;
        console.error(
          `Payment failed for customer ${
            typeof invoice.customer === "string"
              ? invoice.customer
              : invoice.customer?.id
          }, subscription ${subscriptionId ?? "unknown"}`,
        );
        // TODO: Send notification to workspace admin
        break;
      }

      default:
        console.log(`Unhandled Stripe event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook processing error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 },
    );
  }
}

function mapStripeStatus(
  stripeStatus: Stripe.Subscription.Status,
): SubscriptionStatus {
  switch (stripeStatus) {
    case "active":
      return "active";
    case "past_due":
      return "past_due";
    case "canceled":
    case "unpaid":
    case "incomplete_expired":
      return "canceled";
    case "trialing":
      return "trialing";
    default:
      return "active";
  }
}
