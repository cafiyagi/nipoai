import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkPlanFeature } from "@/lib/plan-gate";
import { generateOneOnOneAgenda } from "@/lib/ai/generate-one-on-one-agenda";
import { rateLimit } from "@/lib/rate-limit";
import type { Plan, DailyReport, ReportContent } from "@/lib/supabase/types";

export const maxDuration = 300;

// ---------------------------------------------------------------------------
// POST /api/reports/one-on-one — Generate 1on1 agenda for a target member
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
    const rl = rateLimit(`one-on-one:${user.id}`, {
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
    const { target_user_id } = body as { target_user_id: string };

    if (!target_user_id) {
      return NextResponse.json(
        { error: "target_user_id が必要です" },
        { status: 400 },
      );
    }

    // Get workspace membership for current user
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

    // Admin check
    if (membership.role !== "admin") {
      return NextResponse.json(
        { error: "管理者権限が必要です" },
        { status: 403 },
      );
    }

    // Plan gate
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

    if (!checkPlanFeature(workspace.plan, "oneOnOneAgenda")) {
      return NextResponse.json(
        {
          error:
            "1on1アジェンダ自動生成はTeamプラン以上でご利用いただけます。",
          code: "PLAN_REQUIRED",
        },
        { status: 403 },
      );
    }

    // Verify target user belongs to the same workspace
    const { data: targetMembership } = await admin
      .from("user_workspace_memberships")
      .select("user_id")
      .eq("workspace_id", workspaceId)
      .eq("user_id", target_user_id)
      .maybeSingle();

    if (!targetMembership) {
      return NextResponse.json(
        { error: "対象メンバーがワークスペースに所属していません" },
        { status: 400 },
      );
    }

    // Fetch daily reports for the target user (last 14 days)
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    const since = fourteenDaysAgo.toISOString().slice(0, 10);

    const { data: rawReports } = await admin
      .from("daily_reports")
      .select("id, report_date, content")
      .eq("workspace_id", workspaceId)
      .eq("user_id", target_user_id)
      .gte("report_date", since)
      .order("report_date", { ascending: true });

    const dailyReports = (rawReports ?? []) as unknown as Pick<
      DailyReport,
      "id" | "report_date" | "content"
    >[];

    if (dailyReports.length === 0) {
      return NextResponse.json(
        {
          error:
            "直近14日間の日報がありません。日報が作成されてから1on1アジェンダを生成してください。",
        },
        { status: 400 },
      );
    }

    // Get names
    const [targetProfileResult, managerProfileResult] = await Promise.all([
      admin
        .from("profiles")
        .select("display_name")
        .eq("id", target_user_id)
        .single(),
      supabase.from("profiles").select("display_name").eq("id", user.id).single(),
    ]);

    const targetProfile = targetProfileResult.data as unknown as {
      display_name: string | null;
    } | null;
    const managerProfile = managerProfileResult.data as unknown as {
      display_name: string | null;
    } | null;

    const memberName = targetProfile?.display_name ?? "メンバー";
    const managerName = managerProfile?.display_name ?? "マネージャー";

    // Generate agenda
    const result = await generateOneOnOneAgenda(
      dailyReports.map((r) => ({
        date: r.report_date,
        content: r.content as ReportContent,
      })),
      memberName,
      managerName,
    );

    // Save to DB
    const sourceIds = dailyReports.map((r) => r.id);

    const { data: inserted, error: insertError } = await admin
      .from("one_on_one_agendas")
      .insert({
        workspace_id: workspaceId,
        target_user_id,
        generated_by: user.id,
        content: result.content as unknown as Record<string, unknown>,
        source_report_ids: sourceIds,
        ai_model: result.model,
        token_usage: result.tokenUsage,
      } as never)
      .select("id")
      .single();

    if (insertError) {
      console.error("1on1 agenda save error:", insertError);
      return NextResponse.json(
        { error: "1on1アジェンダの保存に失敗しました" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      agendaId: (inserted as { id: string }).id,
      content: result.content,
    });
  } catch (error) {
    console.error("1on1 agenda generation error:", error);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 },
    );
  }
}
