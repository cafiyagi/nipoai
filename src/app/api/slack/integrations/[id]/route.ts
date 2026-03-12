import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { UserWorkspaceMembership, SlackIntegration } from "@/lib/supabase/types";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// PATCH — update selected_channel_ids
export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id: integrationId } = await context.params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the integration to find its workspace_id
    const admin = createAdminClient();
    const { data: rawIntegration } = await admin
      .from("slack_integrations")
      .select("id, workspace_id")
      .eq("id", integrationId)
      .single();

    if (!rawIntegration) {
      return NextResponse.json(
        { error: "Integration not found" },
        { status: 404 },
      );
    }

    const integration = rawIntegration as Pick<SlackIntegration, "id" | "workspace_id">;

    // Verify user is admin of this workspace
    const { data: rawMembership } = await supabase
      .from("user_workspace_memberships")
      .select("role")
      .eq("user_id", user.id)
      .eq("workspace_id", integration.workspace_id)
      .single();

    const membership = rawMembership as Pick<UserWorkspaceMembership, "role"> | null;

    if (!membership || membership.role !== "admin") {
      return NextResponse.json(
        { error: "Only workspace admins can update integrations" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { selected_channel_ids } = body as {
      selected_channel_ids?: string[];
    };

    if (!Array.isArray(selected_channel_ids)) {
      return NextResponse.json(
        { error: "selected_channel_ids must be an array" },
        { status: 400 },
      );
    }

    const { error: updateError } = await admin
      .from("slack_integrations")
      .update({ selected_channel_ids } as never)
      .eq("id", integrationId);

    if (updateError) {
      console.error("Failed to update integration:", updateError);
      return NextResponse.json(
        { error: "Failed to update integration" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PATCH /api/slack/integrations/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// DELETE — disconnect Slack integration
export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id: integrationId } = await context.params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the integration to find its workspace_id
    const admin = createAdminClient();
    const { data: rawIntegration } = await admin
      .from("slack_integrations")
      .select("id, workspace_id")
      .eq("id", integrationId)
      .single();

    if (!rawIntegration) {
      return NextResponse.json(
        { error: "Integration not found" },
        { status: 404 },
      );
    }

    const integration = rawIntegration as Pick<SlackIntegration, "id" | "workspace_id">;

    // Verify user is admin of this workspace
    const { data: rawMembership } = await supabase
      .from("user_workspace_memberships")
      .select("role")
      .eq("user_id", user.id)
      .eq("workspace_id", integration.workspace_id)
      .single();

    const membership = rawMembership as Pick<UserWorkspaceMembership, "role"> | null;

    if (!membership || membership.role !== "admin") {
      return NextResponse.json(
        { error: "Only workspace admins can disconnect integrations" },
        { status: 403 },
      );
    }

    const { error: deleteError } = await admin
      .from("slack_integrations")
      .delete()
      .eq("id", integrationId);

    if (deleteError) {
      console.error("Failed to delete integration:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete integration" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/slack/integrations/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
