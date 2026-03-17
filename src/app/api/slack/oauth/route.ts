import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomBytes } from "crypto";

const SLACK_CLIENT_ID = process.env.SLACK_CLIENT_ID!;
const SLACK_SCOPES =
  "channels:history,channels:read,channels:join,groups:history,groups:read,chat:write,im:write,users:read";
const SLACK_USER_SCOPES = "channels:write,groups:write";

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

    if (!SLACK_CLIENT_ID) {
      return NextResponse.json(
        { error: "Slack OAuth is not configured" },
        { status: 500 },
      );
    }

    // Generate CSRF state token embedding the workspace ID
    const nonce = randomBytes(16).toString("hex");
    const state = `${nonce}:${workspaceId}`;

    // Store state in an HTTP-only cookie for verification in the callback
    const cookieStore = await cookies();
    cookieStore.set("slack_oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600, // 10 minutes
      path: "/",
    });

    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/slack/callback`;

    const slackAuthUrl = new URL("https://slack.com/oauth/v2/authorize");
    slackAuthUrl.searchParams.set("client_id", SLACK_CLIENT_ID);
    slackAuthUrl.searchParams.set("scope", SLACK_SCOPES);
    slackAuthUrl.searchParams.set("redirect_uri", redirectUri);
    slackAuthUrl.searchParams.set("state", state);
    slackAuthUrl.searchParams.set("user_scope", SLACK_USER_SCOPES);

    return NextResponse.redirect(slackAuthUrl.toString());
  } catch (error) {
    console.error("Slack OAuth start error:", error);
    return NextResponse.json(
      { error: "Failed to initiate Slack OAuth" },
      { status: 500 },
    );
  }
}
