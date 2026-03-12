import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe/client";
import type { UserWorkspaceMembership, Workspace } from "@/lib/supabase/types";

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
    const { workspace_id } = body as { workspace_id?: string };

    if (!workspace_id) {
      return NextResponse.json(
        { error: "workspace_id is required" },
        { status: 400 },
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

    // Get the workspace's Stripe customer ID
    const { data: rawWorkspace } = await supabase
      .from("workspaces")
      .select("stripe_customer_id")
      .eq("id", workspace_id)
      .single();

    const workspace = rawWorkspace as Pick<
      Workspace,
      "stripe_customer_id"
    > | null;

    if (!workspace?.stripe_customer_id) {
      return NextResponse.json(
        {
          error:
            "No billing account found. Please subscribe to a plan first.",
        },
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

    const session = await stripe.billingPortal.sessions.create({
      customer: workspace.stripe_customer_id,
      return_url: `${appUrl}/dashboard/settings`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("POST /api/billing/portal error:", error);
    return NextResponse.json(
      { error: "Failed to create portal session" },
      { status: 500 },
    );
  }
}
