import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe/client";
import { STRIPE_PLANS } from "@/lib/stripe/plans";
import type Stripe from "stripe";
import type { Plan, UserWorkspaceMembership, Workspace } from "@/lib/supabase/types";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { plan, workspace_id } = body as {
      plan?: string;
      workspace_id?: string;
    };

    if (!plan || !workspace_id) {
      return NextResponse.json(
        { error: "plan and workspace_id are required" },
        { status: 400 },
      );
    }

    if (plan !== "starter" && plan !== "team") {
      return NextResponse.json(
        { error: "Invalid plan. Must be 'starter' or 'team'" },
        { status: 400 },
      );
    }

    const planConfig = STRIPE_PLANS[plan as Plan];
    if (!planConfig || !planConfig.stripePriceId) {
      return NextResponse.json(
        { error: "Plan pricing is not configured" },
        { status: 500 },
      );
    }

    // Verify the user is an admin of this workspace
    const { data: rawMembership } = await supabase
      .from("user_workspace_memberships")
      .select("role")
      .eq("user_id", user.id)
      .eq("workspace_id", workspace_id)
      .single();

    const membership = rawMembership as Pick<
      UserWorkspaceMembership,
      "role"
    > | null;

    if (!membership || membership.role !== "admin") {
      return NextResponse.json(
        { error: "Only workspace admins can manage billing" },
        { status: 403 },
      );
    }

    // Get workspace to check for existing Stripe customer
    const { data: rawWorkspace } = await supabase
      .from("workspaces")
      .select("stripe_customer_id, name")
      .eq("id", workspace_id)
      .single();

    const workspace = rawWorkspace as Pick<
      Workspace,
      "stripe_customer_id" | "name"
    > | null;

    if (!workspace) {
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 404 },
      );
    }

    const stripe = getStripe();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;

    if (!appUrl) {
      console.error("NEXT_PUBLIC_APP_URL is not set");
      return NextResponse.json(
        { error: "Application URL is not configured" },
        { status: 500 },
      );
    }

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: "subscription",
      line_items: [
        {
          price: planConfig.stripePriceId,
          quantity: 1,
        },
      ],
      success_url: `${appUrl}/dashboard/settings?checkout=success`,
      cancel_url: `${appUrl}/dashboard/settings?checkout=canceled`,
      metadata: {
        workspace_id,
      },
      subscription_data: {
        metadata: {
          workspace_id,
        },
      },
    };

    if (workspace.stripe_customer_id) {
      sessionParams.customer = workspace.stripe_customer_id;
      sessionParams.customer_update = {
        name: "auto",
      };
    } else {
      sessionParams.customer_creation = "always";
      sessionParams.customer_email = user.email ?? undefined;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("POST /api/billing/checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 },
    );
  }
}
