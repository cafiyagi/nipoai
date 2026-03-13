import Link from "next/link";
import {
  FileText,
  MessageSquare,
  Users,
  ArrowRight,
  CheckCircle,
  Edit3,
  Clock,
} from "lucide-react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

import { getWorkspaceContext } from "@/lib/dashboard/get-workspace-context";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TodayReportCard } from "./today-report-card";
import { ReportDeleteButton } from "./report-delete-button";
import type {
  ReportStatus,
  ReportContent,
  DailyReport,
  SlackIntegration,
} from "@/lib/supabase/types";

// ---------------------------------------------------------------------------
// Status display configuration
// ---------------------------------------------------------------------------

type DisplayStatus = ReportStatus | "not_generated";

const statusConfig: Record<
  DisplayStatus,
  { label: string; variant: "success" | "default" | "secondary"; icon: typeof CheckCircle }
> = {
  submitted: { label: "提出済み", variant: "success", icon: CheckCircle },
  delivered: { label: "配信済み", variant: "success", icon: CheckCircle },
  draft: { label: "下書き", variant: "default", icon: Edit3 },
  generating: { label: "生成中", variant: "secondary", icon: Clock },
  not_generated: { label: "未生成", variant: "secondary", icon: Clock },
};

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
  const { user, supabase, workspace, workspaceId } =
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
    status: r.status as DisplayStatus,
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

  return (
    <div>
      <Header title="ダッシュボード" />

      <div className="p-6">
        {/* Greeting */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">
            {getGreeting()}、{profileName}さん
          </h2>
          <p className="mt-1 text-gray-500">
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

        {/* Compact stats row */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2">
          {/* Slack status card — entire card is a link */}
          <Link
            href="/dashboard/settings?tab=slack"
            className="group block"
          >
            <Card className="transition-colors group-hover:border-gray-300">
              <div className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-50">
                  <MessageSquare className="h-5 w-5 text-purple-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    Slack連携
                  </p>
                  <p className="text-sm text-gray-500">
                    {slackConnected
                      ? `${slackChannelCount}チャンネル接続中`
                      : "未連携"}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-gray-300 transition-colors group-hover:text-gray-500" />
              </div>
            </Card>
          </Link>

          {/* Team card — entire card is a link */}
          <Link
            href="/dashboard/team"
            className="group block"
          >
            <Card className="transition-colors group-hover:border-gray-300">
              <div className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-50">
                  <Users className="h-5 w-5 text-green-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    チーム
                  </p>
                  <p className="text-sm text-gray-500">
                    {memberCount > 0
                      ? `${memberCount}人のメンバー`
                      : "メンバーなし"}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-gray-300 transition-colors group-hover:text-gray-500" />
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
            {recentReports.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                  <FileText className="h-6 w-6 text-gray-400" />
                </div>
                <p className="mt-4 text-sm font-medium text-gray-900">
                  まだ日報がありません
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  Slackを連携すると、メッセージから自動で日報が生成されます。
                </p>
              </div>
            ) : (
              <div className="flex flex-col divide-y divide-gray-100">
                {recentReports.map((report) => {
                  const config = statusConfig[report.status];
                  return (
                    <div
                      key={report.id}
                      className="-mx-2 flex items-center gap-4 rounded-lg px-2 py-3 transition-colors hover:bg-gray-50"
                    >
                      <Link
                        href={`/dashboard/reports/${report.id}`}
                        className="flex min-w-0 flex-1 items-center gap-4"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100">
                          <FileText className="h-4 w-4 text-gray-500" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {report.date}
                          </p>
                          {report.summary ? (
                            <p className="mt-0.5 truncate text-sm text-gray-500">
                              {report.summary}
                            </p>
                          ) : (
                            <p className="mt-0.5 text-sm italic text-gray-400">
                              内容なし
                            </p>
                          )}
                        </div>
                        <Badge variant={config.variant}>{config.label}</Badge>
                      </Link>
                      <ReportDeleteButton reportId={report.id} status={report.status} />
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
