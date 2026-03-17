import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkPlanFeature } from "@/lib/plan-gate";
import { generateWeeklyReport } from "@/lib/ai/generate-weekly-report";
import { rateLimit } from "@/lib/rate-limit";
import type {
  Plan,
  DailyReport,
  ReportContent,
} from "@/lib/supabase/types";

export const maxDuration = 300;

// ---------------------------------------------------------------------------
// POST /api/reports/weekly — Generate weekly report for current user
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
    const rl = rateLimit(`weekly:${user.id}`, { limit: 5, windowMs: 60_000 });
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

    // Get workspace
    const { data: rawMembership } = await supabase
      .from("user_workspace_memberships")
      .select("workspace_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    if (!rawMembership) {
      return NextResponse.json(
        { error: "ワークスペースが見つかりません" },
        { status: 400 },
      );
    }

    const membership = rawMembership as unknown as { workspace_id: string };
    const workspaceId = membership.workspace_id;

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

    // Plan gate: weekly report requires Starter+
    if (!checkPlanFeature(workspace.plan, "weeklyReport")) {
      return NextResponse.json(
        {
          error: "週報生成はStarterプラン以上でご利用いただけます。",
          code: "PLAN_REQUIRED",
        },
        { status: 403 },
      );
    }

    // Check if weekly report already exists
    const { data: existing } = await admin
      .from("weekly_reports")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .eq("week_start", week_start)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({
        ok: true,
        weeklyReportId: (existing as { id: string }).id,
        status: "existing" as const,
      });
    }

    // Fetch daily reports for the week
    const { data: rawReports } = await admin
      .from("daily_reports")
      .select("id, report_date, content")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .gte("report_date", week_start)
      .lte("report_date", week_end)
      .order("report_date", { ascending: true });

    const dailyReports = (rawReports ?? []) as unknown as Pick<
      DailyReport,
      "id" | "report_date" | "content"
    >[];

    if (dailyReports.length === 0) {
      return NextResponse.json(
        { error: "この週の日報がありません。日報を作成してから週報を生成してください。" },
        { status: 400 },
      );
    }

    // Get user name
    const { data: rawProfile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .single();
    const profileData = rawProfile as unknown as { display_name: string | null } | null;
    const userName = profileData?.display_name ?? "メンバー";

    // Generate weekly report
    const result = await generateWeeklyReport(
      dailyReports.map((r) => ({
        date: r.report_date,
        content: r.content as ReportContent,
      })),
      userName,
      week_start,
      week_end,
    );

    // Save to DB
    const sourceIds = dailyReports.map((r) => r.id);

    const { data: inserted, error: insertError } = await admin
      .from("weekly_reports")
      .insert({
        workspace_id: workspaceId,
        user_id: user.id,
        week_start,
        week_end,
        content: result.content as unknown as Record<string, unknown>,
        source_report_ids: sourceIds,
        ai_model: result.model,
        token_usage: result.tokenUsage,
      } as never)
      .select("id")
      .single();

    if (insertError) {
      console.error("Weekly report save error:", insertError);
      return NextResponse.json(
        { error: "週報の保存に失敗しました" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      weeklyReportId: (inserted as { id: string }).id,
      status: "created" as const,
    });
  } catch (error) {
    console.error("Weekly report generation error:", error);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 },
    );
  }
}
