import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { WebClient } from "@slack/web-api";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { encrypt } from "@/lib/slack/encryption";
import type { SlackIntegrationInsert } from "@/lib/supabase/types";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    // User denied the OAuth request
    if (error) {
      const redirectUrl = new URL(
        "/dashboard/settings",
        process.env.NEXT_PUBLIC_APP_URL,
      );
      redirectUrl.searchParams.set("slack_error", error);
      return NextResponse.redirect(redirectUrl.toString());
    }

    if (!code || !state) {
      return NextResponse.json(
        { error: "Missing code or state parameter" },
        { status: 400 },
      );
    }

    // Verify CSRF state
    const cookieStore = await cookies();
    const storedState = cookieStore.get("slack_oauth_state")?.value;

    if (!storedState || storedState !== state) {
      return NextResponse.json(
        { error: "Invalid or expired state parameter" },
        { status: 403 },
      );
    }

    // Clear the state cookie
    cookieStore.delete("slack_oauth_state");

    // Extract workspace ID from state
    const stateWorkspaceId = state.split(":").slice(1).join(":");

    // Verify the user is authenticated
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(
        new URL("/login", process.env.NEXT_PUBLIC_APP_URL).toString(),
      );
    }

    // H-3: Verify the user is an admin of the target workspace
    const { data: membership } = await supabase
      .from("user_workspace_memberships")
      .select("role")
      .eq("user_id", user.id)
      .eq("workspace_id", stateWorkspaceId)
      .single();

    if (!membership || (membership as { role: string }).role !== "admin") {
      const redirectUrl = new URL(
        "/dashboard/settings",
        process.env.NEXT_PUBLIC_APP_URL,
      );
      redirectUrl.searchParams.set("slack_error", "forbidden");
      return NextResponse.redirect(redirectUrl.toString());
    }

    // Exchange code for token
    const slackClient = new WebClient();
    const oauthResult = await slackClient.oauth.v2.access({
      client_id: process.env.SLACK_CLIENT_ID!,
      client_secret: process.env.SLACK_CLIENT_SECRET!,
      code,
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/slack/callback`,
    });

    if (!oauthResult.ok || !oauthResult.access_token) {
      throw new Error(
        `Slack OAuth failed: ${oauthResult.error ?? "unknown error"}`,
      );
    }

    const botToken = oauthResult.access_token;
    const teamId = oauthResult.team?.id;
    const teamName = oauthResult.team?.name;

    if (!teamId) {
      throw new Error("No team ID returned from Slack OAuth");
    }

    // Encrypt the bot token before storage
    const encryptedToken = encrypt(botToken);

    // Upsert into slack_integrations using admin client (bypasses RLS)
    const admin = createAdminClient();
    const row: SlackIntegrationInsert = {
      workspace_id: stateWorkspaceId,
      slack_team_id: teamId,
      slack_team_name: teamName ?? null,
      encrypted_bot_token: encryptedToken,
      installed_by: user.id,
    };

    const { error: upsertError } = await admin
      .from("slack_integrations")
      .upsert(row as never, {
        onConflict: "workspace_id,slack_team_id",
      });

    if (upsertError) {
      console.error("Failed to save Slack integration:", upsertError);
      throw new Error("Failed to save Slack integration");
    }

    // After re-connection: rejoin previously selected channels with the new token
    try {
      const { data: rawSaved } = await admin
        .from("slack_integrations")
        .select("selected_channel_ids")
        .eq("workspace_id", stateWorkspaceId)
        .eq("slack_team_id", teamId)
        .single();

      const saved = rawSaved as { selected_channel_ids: string[] | null } | null;
      const channelIds = saved?.selected_channel_ids ?? [];

      if (channelIds.length > 0) {
        const authedClient = new WebClient(botToken);
        for (const channelId of channelIds) {
          try {
            await authedClient.conversations.join({ channel: channelId });
          } catch {
            // Private channels can't be auto-joined — user will need /invite
          }
        }
      }
    } catch (rejoinError) {
      // Non-fatal: don't block the OAuth flow
      console.warn("Failed to rejoin channels after re-connection:", rejoinError);
    }

    const redirectUrl = new URL(
      "/dashboard/settings",
      process.env.NEXT_PUBLIC_APP_URL,
    );
    redirectUrl.searchParams.set("tab", "slack");
    redirectUrl.searchParams.set("slack_connected", "true");

    return NextResponse.redirect(redirectUrl.toString());
  } catch (error) {
    console.error("Slack OAuth callback error:", error);
    const redirectUrl = new URL(
      "/dashboard/settings",
      process.env.NEXT_PUBLIC_APP_URL,
    );
    redirectUrl.searchParams.set("slack_error", "callback_failed");
    return NextResponse.redirect(redirectUrl.toString());
  }
}
