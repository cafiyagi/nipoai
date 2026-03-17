import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { WebClient } from "@slack/web-api";
import { createSlackClient } from "@/lib/slack/client";
import { decrypt } from "@/lib/slack/encryption";
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

    // Fetch the bot token so we can join channels
    const { data: rawFullIntegration } = await admin
      .from("slack_integrations")
      .select("encrypted_bot_token, encrypted_user_token, bot_user_id")
      .eq("id", integrationId)
      .single();

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

    // Auto-join bot to selected channels
    if (rawFullIntegration) {
      const fullIntegration = rawFullIntegration as {
        encrypted_bot_token: string;
        encrypted_user_token: string | null;
        bot_user_id: string | null;
      };
      const slackClient = createSlackClient(fullIntegration.encrypted_bot_token);
      const userToken = fullIntegration.encrypted_user_token
        ? decrypt(fullIntegration.encrypted_user_token)
        : null;
      const botUserId = fullIntegration.bot_user_id;
      const joinErrors: string[] = [];

      for (const channelId of selected_channel_ids) {
        try {
          await slackClient.conversations.join({ channel: channelId });
        } catch {
          // Private channels can't be joined via API — try inviting via user token
          if (userToken && botUserId) {
            try {
              const userClient = new WebClient(userToken);
              await userClient.conversations.invite({
                channel: channelId,
                users: botUserId,
              });
            } catch (inviteErr) {
              const err = inviteErr as { data?: { error?: string } };
              if (err.data?.error !== "already_in_channel") {
                joinErrors.push(channelId);
              }
            }
          } else {
            joinErrors.push(channelId);
          }
        }
      }

      if (joinErrors.length > 0) {
        return NextResponse.json({
          success: true,
          warning: `一部のプライベートチャンネルにはボットを自動追加できませんでした。Slackで /invite @NipoAI を実行してください。`,
          failed_channels: joinErrors,
        });
      }
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
