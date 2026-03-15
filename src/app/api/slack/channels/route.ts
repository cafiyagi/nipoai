import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createSlackClient } from "@/lib/slack/client";
import type { SlackIntegration } from "@/lib/supabase/types";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspace_id");

    if (!workspaceId) {
      return NextResponse.json(
        { error: "workspace_id is required" },
        { status: 400 },
      );
    }

    // Verify authenticated user
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify the user belongs to this workspace
    const { data: membership } = await supabase
      .from("user_workspace_memberships")
      .select("id")
      .eq("user_id", user.id)
      .eq("workspace_id", workspaceId)
      .single();

    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get the Slack integration for this workspace
    const { data: integrationRow, error: integrationError } = await supabase
      .from("slack_integrations")
      .select("id, encrypted_bot_token")
      .eq("workspace_id", workspaceId)
      .single();

    if (integrationError || !integrationRow) {
      console.error("Integration lookup failed:", integrationError);
      return NextResponse.json(
        { error: "No Slack integration found for this workspace" },
        { status: 404 },
      );
    }

    const integration = integrationRow as Pick<
      SlackIntegration,
      "id" | "encrypted_bot_token"
    >;

    // Fetch channels using the Slack API
    const slackClient = createSlackClient(integration.encrypted_bot_token);

    const channels: Array<{
      id: string;
      name: string;
      is_private: boolean;
      num_members: number;
    }> = [];

    let cursor: string | undefined;
    let hasMore = true;

    while (hasMore) {
      const result = await slackClient.conversations.list({
        types: "public_channel,private_channel",
        exclude_archived: true,
        limit: 200,
        cursor,
      });

      if (result.channels) {
        for (const ch of result.channels) {
          if (ch.id && ch.name) {
            channels.push({
              id: ch.id,
              name: ch.name,
              is_private: ch.is_private ?? false,
              num_members: ch.num_members ?? 0,
            });
          }
        }
      }

      cursor = result.response_metadata?.next_cursor;
      hasMore = !!cursor;
    }

    // Sort by name for consistent ordering
    channels.sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({ channels });
  } catch (error) {
    console.error("Failed to fetch Slack channels:", error instanceof Error ? error.message : error, error instanceof Error ? error.stack : "");
    return NextResponse.json(
      { error: "Failed to fetch Slack channels" },
      { status: 500 },
    );
  }
}
