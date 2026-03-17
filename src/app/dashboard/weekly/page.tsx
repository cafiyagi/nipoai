import { format, startOfWeek, subWeeks } from "date-fns";
import { ja } from "date-fns/locale";
import Link from "next/link";

import { getWorkspaceContext } from "@/lib/dashboard/get-workspace-context";
import { Header } from "@/components/layout/header";
import { PLANS } from "@/lib/constants";
import { WeeklyReportCard } from "./weekly-report-card";
import { WeeklyTabs } from "./weekly-tabs";
import { TeamSummaryCard } from "./team-summary-card";
import type { Plan } from "@/lib/supabase/types";

export default async function WeeklyReportsPage() {
  const { user, supabase, workspace, workspaceId, isAdmin } =
    await getWorkspaceContext();

  const plan = workspace.plan as Plan;
  const canGenerate = PLANS[plan].limits.weeklyReport;
  const canTeamSummary = PLANS[plan].limits.teamSummary;

  // Generate last 4 weeks
  const now = new Date();
  const weeks = Array.from({ length: 4 }, (_, i) => {
    const weekStart = startOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    return {
      start: format(weekStart, "yyyy-MM-dd"),
      end: format(weekEnd, "yyyy-MM-dd"),
      label: format(weekStart, "M月d日の週", { locale: ja }),
    };
  });

  // Fetch existing weekly reports
  const { data: rawReports } = await supabase
    .from("weekly_reports")
    .select("id, week_start, week_end, content")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .in(
      "week_start",
      weeks.map((w) => w.start),
    )
    .order("week_start", { ascending: false });

  const existingReports = (rawReports ?? []) as unknown as {
    id: string;
    week_start: string;
    week_end: string;
    content: {
      highlights: string[];
      progress: string[];
      challenges: string[];
      next_week_focus: string[];
    };
  }[];

  const reportMap = new Map(
    existingReports.map((r) => [
      r.week_start,
      {
        id: r.id,
        weekStart: r.week_start,
        weekEnd: r.week_end,
        content: r.content,
      },
    ]),
  );

  // Fetch existing team summaries
  const { data: rawTeamSummaries } = await supabase
    .from("team_summaries")
    .select("id, week_start, week_end, content")
    .eq("workspace_id", workspaceId)
    .in(
      "week_start",
      weeks.map((w) => w.start),
    )
    .order("week_start", { ascending: false });

  const existingTeamSummaries = (rawTeamSummaries ?? []) as unknown as {
    id: string;
    week_start: string;
    week_end: string;
    content: {
      team_highlights: string[];
      progress_overview: string[];
      challenges: string[];
      risks: string[];
      next_week_focus: string[];
    };
  }[];

  const teamSummaryMap = new Map(
    existingTeamSummaries.map((s) => [
      s.week_start,
      {
        id: s.id,
        weekStart: s.week_start,
        weekEnd: s.week_end,
        content: s.content,
      },
    ]),
  );

  const personalContent = (
    <>
      {!canGenerate && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/20 dark:bg-amber-500/10">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
            週報生成はStarterプラン以上でご利用いただけます。
          </p>
          <Link
            href="/dashboard/settings?tab=billing"
            className="mt-1 inline-block text-sm text-amber-600 hover:underline dark:text-amber-300"
          >
            プランをアップグレード →
          </Link>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {weeks.map((week) => (
          <WeeklyReportCard
            key={week.start}
            weekStart={week.start}
            weekEnd={week.end}
            weekLabel={week.label}
            existingReport={reportMap.get(week.start) ?? null}
            canGenerate={canGenerate}
          />
        ))}
      </div>
    </>
  );

  const teamContent = (
    <>
      {!canTeamSummary && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/20 dark:bg-amber-500/10">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
            チームサマリーはStarterプラン以上でご利用いただけます。
          </p>
          <Link
            href="/dashboard/settings?tab=billing"
            className="mt-1 inline-block text-sm text-amber-600 hover:underline dark:text-amber-300"
          >
            プランをアップグレード →
          </Link>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {weeks.map((week) => (
          <TeamSummaryCard
            key={week.start}
            weekStart={week.start}
            weekEnd={week.end}
            weekLabel={week.label}
            existingSummary={teamSummaryMap.get(week.start) ?? null}
            canGenerate={canTeamSummary}
            isAdmin={isAdmin}
          />
        ))}
      </div>
    </>
  );

  return (
    <div>
      <Header title="週報" />

      <div className="p-6">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            週報一覧
          </h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            日報を元にAIが週のサマリーを自動生成します。
          </p>
        </div>

        <WeeklyTabs
          personalContent={personalContent}
          teamContent={teamContent}
          teamSummaryAvailable={canTeamSummary}
        />
      </div>
    </div>
  );
}
