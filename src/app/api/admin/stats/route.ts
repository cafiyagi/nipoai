import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const SUPER_ADMIN_EMAILS = ["cafiyagi@gmail.com"];

export async function GET() {
  try {
    // Authenticate via session
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !SUPER_ADMIN_EMAILS.includes(user.email ?? "")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const admin = createAdminClient();

    // Fetch all data in parallel
    const [
      profilesResult,
      workspacesResult,
      slackResult,
      membershipsResult,
      reportsResult,
    ] = await Promise.all([
      admin
        .from("profiles")
        .select("id, email, display_name, avatar_url, created_at")
        .order("created_at", { ascending: false }),
      admin
        .from("workspaces")
        .select("id, name, slug, plan, created_at")
        .order("created_at", { ascending: false }),
      admin
        .from("slack_integrations")
        .select(
          "id, workspace_id, slack_team_id, slack_team_name, selected_channel_ids, installed_by, created_at",
        )
        .order("created_at", { ascending: false }),
      admin
        .from("user_workspace_memberships")
        .select("id, user_id, workspace_id, role, created_at")
        .order("created_at", { ascending: false }),
      admin
        .from("daily_reports")
        .select("id, workspace_id, user_id, report_date, status, created_at")
        .order("created_at", { ascending: false })
        .limit(100),
    ]);

    return NextResponse.json({
      profiles: profilesResult.data ?? [],
      workspaces: workspacesResult.data ?? [],
      slackIntegrations: slackResult.data ?? [],
      memberships: membershipsResult.data ?? [],
      recentReports: reportsResult.data ?? [],
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
