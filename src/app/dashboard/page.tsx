import Link from "next/link";
import {
  MessageSquare,
  Users,
  ArrowRight,
} from "lucide-react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

import { getWorkspaceContext } from "@/lib/dashboard/get-workspace-context";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { TodayReportCard } from "./today-report-card";
import { RecentReportsList } from "./recent-reports-list";
import { UsageBar } from "./usage-bar";
import { getReportUsage } from "@/lib/plan-gate";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_TEMPLATE } from "@/lib/report-template";
import { TemplateEditor } from "./settings/template/template-editor";
import type {
  ReportStatus,
  ReportContent,
  DailyReport,
  SlackIntegration,
  Plan,
} from "@/lib/supabase/types";

// ---------------------------------------------------------------------------
// Helper: build summary from JSONB content
// ---------------------------------------------------------------------------

function buildSummary(content: ReportContent | null): string {
  if (!content) return "";
  const achievements = content.achievements ?? [];
  if (achievements.length > 0) return achievements[0];
  const challenges = content.challenges ?? [];
  if (challenges.length > 0) return challenges[0];
  return "";
}

// ---------------------------------------------------------------------------
// Helper: greeting based on time of day
// ---------------------------------------------------------------------------

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "おはようございます";
  if (hour < 18) return "こんにちは";
  return "お疲れさまです";
}

// ---------------------------------------------------------------------------
// Page component (Server Component)
// ---------------------------------------------------------------------------

export default async function DashboardPage() {
  const { user, supabase, workspace, workspaceId, isAdmin } =
    await getWorkspaceContext();

  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");
  const displayName =
    user.user_metadata?.display_name ||
    user.email?.split("@")[0] ||
    "ユーザー";

  // All queries in parallel
  const [
    profileResult,
    todayReportResult,
    recentReportsResult,
    slackResult,
    memberCountResult,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .single(),
    supabase
      .from("daily_reports")
      .select("id, status")
      .eq("user_id", user.id)
      .eq("report_date", todayStr)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("daily_reports")
      .select("id, report_date, status, content")
      .eq("user_id", user.id)
      .order("report_date", { ascending: false })
      .limit(5),
    supabase
      .from("slack_integrations")
      .select("selected_channel_ids")
      .eq("workspace_id", workspaceId)
      .limit(1)
      .maybeSingle(),
    supabase
      .from("user_workspace_memberships")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId),
  ]);

  // Profile
  const profileName =
    (profileResult.data as { display_name: string | null } | null)
      ?.display_name || displayName;

  // Today's report
  const todayReport = todayReportResult.data as {
    id: string;
    status: ReportStatus;
  } | null;

  const initialStatus: "not_generated" | "draft" | "submitted" | "delivered" =
    todayReport?.status === "submitted"
      ? "submitted"
      : todayReport?.status === "delivered"
        ? "delivered"
        : todayReport?.status === "draft"
          ? "draft"
          : "not_generated";

  // Recent reports
  const recentReportsRaw = (recentReportsResult.data ?? []) as unknown as Pick<
    DailyReport,
    "id" | "report_date" | "status" | "content"
  >[];

  const recentReports = recentReportsRaw.map((r) => ({
    id: r.id,
    date: format(new Date(r.report_date + "T00:00:00"), "yyyy年M月d日（E）", {
      locale: ja,
    }),
    status: r.status as string,
    summary: buildSummary(r.content ?? null),
  }));

  // Slack
  const slackData = slackResult.data as Pick<
    SlackIntegration,
    "selected_channel_ids"
  > | null;
  const slackConnected = !!slackData;
  const slackChannelCount = slackData?.selected_channel_ids?.length ?? 0;

  // Member count
  const memberCount = memberCountResult.count ?? 0;

  // Report generation time
  const reportGenerationTime = workspace.report_generation_time ?? null;

  // Report usage (for free plan quota display)
  const admin = createAdminClient();
  const reportUsage = await getReportUsage(
    admin,
    workspaceId,
    workspace.plan as Plan,
  );

  // Template for admin editor
  const template = workspace.report_template ?? DEFAULT_TEMPLATE;

  return (
    <div>
      <Header title="ダッシュボード" />

      <div className="p-6">
        {/* Greeting */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">
            {getGreeting()}、{profileName}さん
          </h2>
          <p className="mt-1 text-[var(--text-secondary)]">
            {format(today, "yyyy年M月d日（E）", { locale: ja })}
          </p>
        </div>

        {/* Hero: Today's Report Card (full width) */}
        <div className="mb-6">
          <TodayReportCard
            initialStatus={initialStatus}
            todayReportId={todayReport?.id ?? null}
            slackConnected={slackConnected}
            reportGenerationTime={reportGenerationTime}
          />
        </div>

        {/* Usage bar for limited plans */}
        {reportUsage.limit !== Infinity && (
          <div className="mb-6">
            <UsageBar
              used={reportUsage.used}
              limit={reportUsage.limit}
              remaining={reportUsage.remaining}
            />
          </div>
        )}

        {/* Compact stats row */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2">
          {/* Slack status card — entire card is a link */}
          <Link
            href="/dashboard/settings?tab=slack"
            className="group block"
          >
            <Card className="transition-colors group-hover:border-[var(--border-secondary)]">
              <div className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--icon-bg-purple)]">
                  <MessageSquare className="h-5 w-5 text-[var(--icon-text-purple)]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-[var(--text-primary)]">
                    Slack連携
                  </p>
                  <p className="text-sm text-[var(--text-secondary)]">
                    {slackConnected
                      ? `${slackChannelCount}チャンネル接続中`
                      : "未連携"}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-[var(--text-muted)] transition-colors group-hover:text-[var(--text-secondary)]" />
              </div>
            </Card>
          </Link>

          {/* Team card — entire card is a link */}
          <Link
            href="/dashboard/team"
            className="group block"
          >
            <Card className="transition-colors group-hover:border-[var(--border-secondary)]">
              <div className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--icon-bg-green)]">
                  <Users className="h-5 w-5 text-[var(--icon-text-green)]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-[var(--text-primary)]">
                    チーム
                  </p>
                  <p className="text-sm text-[var(--text-secondary)]">
                    {memberCount > 0
                      ? `${memberCount}人のメンバー`
                      : "メンバーなし"}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-[var(--text-muted)] transition-colors group-hover:text-[var(--text-secondary)]" />
              </div>
            </Card>
          </Link>
        </div>

        {/* Recent reports */}
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>最近の日報</CardTitle>
            <Link href="/dashboard/reports">
              <Button variant="ghost" size="sm">
                すべて見る
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <RecentReportsList reports={recentReports} />
          </CardContent>
        </Card>

        {/* Template editor (admin only) */}
        {isAdmin && (
          <div className="mt-6">
            <TemplateEditor
              workspaceId={workspaceId}
              initialTemplate={template}
            />
          </div>
        )}
      </div>
    </div>
  );
}
