import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkPlanFeature } from "@/lib/plan-gate";
import type { Plan } from "@/lib/supabase/types";

// ---------------------------------------------------------------------------
// GET /api/analytics/submission-rate?workspace_id=...&days=30
// ---------------------------------------------------------------------------

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const workspaceId = url.searchParams.get("workspace_id");
    const days = Math.min(parseInt(url.searchParams.get("days") ?? "30", 10), 90);

    if (!workspaceId) {
      return NextResponse.json({ error: "workspace_id is required" }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check membership + admin
    const { data: rawMembership } = await supabase
      .from("user_workspace_memberships")
      .select("role")
      .eq("user_id", user.id)
      .eq("workspace_id", workspaceId)
      .single();

    if (!rawMembership) {
      return NextResponse.json({ error: "Not a member" }, { status: 403 });
    }

    // Check plan
    const admin = createAdminClient();
    const { data: rawWorkspace } = await admin
      .from("workspaces")
      .select("plan")
      .eq("id", workspaceId)
      .single();

    if (!rawWorkspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    const plan = (rawWorkspace as { plan: Plan }).plan;

    if (!checkPlanFeature(plan, "adminDashboard")) {
      return NextResponse.json(
        { error: "分析機能はTeamプラン以上でご利用いただけます。", code: "PLAN_REQUIRED" },
        { status: 403 },
      );
    }

    // Get member count
    const { count: memberCount } = await admin
      .from("user_workspace_memberships")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId);

    const totalMembers = memberCount ?? 0;

    // Get daily submission counts for the past N days
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startStr = startDate.toISOString().slice(0, 10);

    const { data: rawReports } = await admin
      .from("daily_reports")
      .select("report_date, user_id")
      .eq("workspace_id", workspaceId)
      .gte("report_date", startStr);

    const reports = (rawReports ?? []) as { report_date: string; user_id: string }[];

    // Group by date
    const byDate: Record<string, Set<string>> = {};
    for (const r of reports) {
      if (!byDate[r.report_date]) byDate[r.report_date] = new Set();
      byDate[r.report_date].add(r.user_id);
    }

    // Build daily data
    const dailyData: { date: string; submitted: number; rate: number }[] = [];
    const current = new Date(startStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    while (current <= today) {
      const dateStr = current.toISOString().slice(0, 10);
      const submitted = byDate[dateStr]?.size ?? 0;
      const rate = totalMembers > 0 ? Math.round((submitted / totalMembers) * 100) : 0;
      dailyData.push({ date: dateStr, submitted, rate });
      current.setDate(current.getDate() + 1);
    }

    // Per-member submission count (last N days)
    const memberSubmissions: Record<string, number> = {};
    for (const r of reports) {
      memberSubmissions[r.user_id] = (memberSubmissions[r.user_id] ?? 0) + 1;
    }

    // Get member profiles
    const memberIds = Object.keys(memberSubmissions);
    let memberDetails: { userId: string; name: string; count: number }[] = [];

    if (memberIds.length > 0) {
      const { data: rawProfiles } = await admin
        .from("profiles")
        .select("id, display_name, email")
        .in("id", memberIds);

      const profiles = (rawProfiles ?? []) as { id: string; display_name: string | null; email: string }[];
      const profileMap = new Map(profiles.map((p) => [p.id, p]));

      // Also get all workspace members for missing submissions
      const { data: rawAllMembers } = await admin
        .from("user_workspace_memberships")
        .select("user_id")
        .eq("workspace_id", workspaceId);

      const allMemberIds = (rawAllMembers ?? []).map((m: { user_id: string }) => m.user_id);

      // Get profiles for all members
      const { data: rawAllProfiles } = await admin
        .from("profiles")
        .select("id, display_name, email")
        .in("id", allMemberIds);

      const allProfiles = (rawAllProfiles ?? []) as { id: string; display_name: string | null; email: string }[];

      memberDetails = allProfiles.map((p) => ({
        userId: p.id,
        name: p.display_name ?? p.email,
        count: memberSubmissions[p.id] ?? 0,
      }));

      memberDetails.sort((a, b) => b.count - a.count);
    }

    return NextResponse.json({
      dailyData,
      memberDetails,
      totalMembers,
      days,
    });
  } catch (error) {
    console.error("Analytics API error:", error);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 },
    );
  }
}
