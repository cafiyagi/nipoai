import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkPlanFeature } from "@/lib/plan-gate";
import { generateTeamSummary } from "@/lib/ai/generate-team-summary";
import { rateLimit } from "@/lib/rate-limit";
import type { Plan, ReportContent } from "@/lib/supabase/types";

export const maxDuration = 300;

// ---------------------------------------------------------------------------
// POST /api/reports/team-summary — Generate weekly team summary
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
    }

    // Rate limit
    const rl = rateLimit(`team-summary:${user.id}`, {
      limit: 5,
      windowMs: 60_000,
    });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "リクエストが多すぎます。しばらくしてから再度お試しください。" },
        { status: 429 },
      );
    }

    // Parse body
    const body = await request.json();
    const { week_start } = body as { week_start: string };

    if (!week_start || !/^\d{4}-\d{2}-\d{2}$/.test(week_start)) {
      return NextResponse.json(
        { error: "week_start (YYYY-MM-DD) が必要です" },
        { status: 400 },
      );
    }

    // Calculate week_end (6 days after week_start)
    const startDate = new Date(week_start + "T00:00:00Z");
    const endDate = new Date(startDate);
    endDate.setUTCDate(endDate.getUTCDate() + 6);
    const week_end = endDate.toISOString().slice(0, 10);

    // Get workspace + role
    const { data: rawMembership } = await supabase
      .from("user_workspace_memberships")
      .select("workspace_id, role")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    if (!rawMembership) {
      return NextResponse.json(
        { error: "ワークスペースが見つかりません" },
        { status: 400 },
      );
    }

    const membership = rawMembership as unknown as {
      workspace_id: string;
      role: string;
    };
    const workspaceId = membership.workspace_id;

    // Admin check — team summary is a manager feature
    if (membership.role !== "admin") {
      return NextResponse.json(
        { error: "チームサマリーの生成は管理者のみ可能です。" },
        { status: 403 },
      );
    }

    const admin = createAdminClient();
    const { data: rawWorkspace } = await admin
      .from("workspaces")
      .select("id, plan")
      .eq("id", workspaceId)
      .single();

    if (!rawWorkspace) {
      return NextResponse.json(
        { error: "ワークスペースが見つかりません" },
        { status: 400 },
      );
    }

    const workspace = rawWorkspace as unknown as { id: string; plan: Plan };

    // Plan gate: team summary requires Starter+
    if (!checkPlanFeature(workspace.plan, "teamSummary")) {
      return NextResponse.json(
        {
          error: "チームサマリーはStarterプラン以上でご利用いただけます。",
          code: "PLAN_REQUIRED",
        },
        { status: 403 },
      );
    }

    // Check if team summary already exists
    const { data: existing } = await admin
      .from("team_summaries")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("week_start", week_start)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({
        ok: true,
        teamSummaryId: (existing as { id: string }).id,
        status: "existing" as const,
      });
    }

    // Fetch ALL members' daily reports for the week
    const { data: rawReports } = await admin
      .from("daily_reports")
      .select("id, user_id, report_date, content")
      .eq("workspace_id", workspaceId)
      .gte("report_date", week_start)
      .lte("report_date", week_end)
      .order("report_date", { ascending: true });

    const dailyReports = (rawReports ?? []) as unknown as {
      id: string;
      user_id: string;
      report_date: string;
      content: ReportContent;
    }[];

    if (dailyReports.length === 0) {
      return NextResponse.json(
        {
          error:
            "この週の日報がありません。メンバーの日報が作成されてからチームサマリーを生成してください。",
        },
        { status: 400 },
      );
    }

    // Get member names
    const userIds = [...new Set(dailyReports.map((r) => r.user_id))];
    const { data: rawProfiles } = await admin
      .from("profiles")
      .select("id, display_name")
      .in("id", userIds);

    const profiles = (rawProfiles ?? []) as unknown as {
      id: string;
      display_name: string | null;
    }[];
    const nameMap = new Map(
      profiles.map((p) => [p.id, p.display_name ?? "メンバー"]),
    );

    // Build input for AI
    const memberReports = dailyReports.map((r) => ({
      memberName: nameMap.get(r.user_id) ?? "メンバー",
      date: r.report_date,
      content: r.content,
    }));

    // Generate team summary
    const result = await generateTeamSummary(memberReports, week_start, week_end);

    // Save to DB
    const { data: inserted, error: insertError } = await admin
      .from("team_summaries")
      .insert({
        workspace_id: workspaceId,
        week_start,
        week_end,
        content: result.content as unknown as Record<string, unknown>,
        source_report_count: dailyReports.length,
        ai_model: result.model,
        token_usage: result.tokenUsage,
        generated_by: user.id,
      } as never)
      .select("id")
      .single();

    if (insertError) {
      console.error("Team summary save error:", insertError);
      return NextResponse.json(
        { error: "チームサマリーの保存に失敗しました" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      teamSummaryId: (inserted as { id: string }).id,
      status: "created" as const,
    });
  } catch (error) {
    console.error("Team summary generation error:", error);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 },
    );
  }
}
