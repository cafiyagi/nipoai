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
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TodayReportCard } from "./today-report-card";
import type {
  ReportStatus,
  ReportContent,
  Profile,
  UserWorkspaceMembership,
  DailyReport,
  SlackIntegration,
  Workspace,
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
  const supabase = await createClient();

  // ---------- Auth ----------
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // ---------- Profile ----------
  const { data: rawProfile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .single();

  const profile = rawProfile as unknown as Pick<Profile, "display_name"> | null;
  const displayName = profile?.display_name || user.email?.split("@")[0] || "ユーザー";

  // ---------- Today's date ----------
  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");

  // ---------- Workspace info ----------
  const { data: rawMemberships } = await supabase
    .from("user_workspace_memberships")
    .select("workspace_id, role")
    .eq("user_id", user.id);

  const memberships = (rawMemberships ?? []) as unknown as Pick<
    UserWorkspaceMembership,
    "workspace_id" | "role"
  >[];
  const workspaceIds = memberships.map((m) => m.workspace_id);
  const firstWorkspaceId = workspaceIds[0] ?? null;

  // ---------- Workspace details (for report_generation_time) ----------
  let reportGenerationTime: string | null = null;

  if (firstWorkspaceId) {
    const { data: rawWorkspace } = await supabase
      .from("workspaces")
      .select("report_generation_time")
      .eq("id", firstWorkspaceId)
      .single();

    if (rawWorkspace) {
      const ws = rawWorkspace as unknown as Pick<Workspace, "report_generation_time">;
      reportGenerationTime = ws.report_generation_time ?? null;
    }
  }

  // ---------- Today's report ----------
  let todayReport: {
    id: string;
    status: ReportStatus;
  } | null = null;

  if (firstWorkspaceId) {
    const { data: rawTodayReport } = await supabase
      .from("daily_reports")
      .select("id, status")
      .eq("user_id", user.id)
      .eq("report_date", todayStr)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (rawTodayReport) {
      todayReport = rawTodayReport as unknown as {
        id: string;
        status: ReportStatus;
      };
    }
  }

  // ---------- Determine TodayReportCard initial status ----------
  const initialStatus: "not_generated" | "draft" | "submitted" | "delivered" =
    todayReport?.status === "submitted"
      ? "submitted"
      : todayReport?.status === "delivered"
        ? "delivered"
        : todayReport?.status === "draft"
          ? "draft"
          : "not_generated";

  // ---------- Recent 5 reports ----------
  const { data: rawRecentReports } = await supabase
    .from("daily_reports")
    .select("id, report_date, status, content")
    .eq("user_id", user.id)
    .order("report_date", { ascending: false })
    .limit(5);

  const recentReportsRaw = (rawRecentReports ?? []) as unknown as Pick<
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

  // ---------- Slack integration ----------
  let slackConnected = false;
  let slackChannelCount = 0;

  if (firstWorkspaceId) {
    const { data: rawSlackData } = await supabase
      .from("slack_integrations")
      .select("selected_channel_ids")
      .eq("workspace_id", firstWorkspaceId)
      .limit(1)
      .maybeSingle();

    const slackData = rawSlackData as unknown as Pick<
      SlackIntegration,
      "selected_channel_ids"
    > | null;

    if (slackData) {
      slackConnected = true;
      slackChannelCount = slackData.selected_channel_ids?.length ?? 0;
    }
  }

  // ---------- Member count ----------
  let memberCount = 0;

  if (firstWorkspaceId) {
    const { count } = await supabase
      .from("user_workspace_memberships")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", firstWorkspaceId);

    memberCount = count ?? 0;
  }

  return (
    <div>
      <Header title="ダッシュボード" />

      <div className="p-6">
        {/* Greeting */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">
            {getGreeting()}、{displayName}さん
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
            href="/dashboard/settings"
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
                    <Link
                      key={report.id}
                      href={`/dashboard/reports/${report.id}`}
                      className="-mx-2 flex items-center gap-4 rounded-lg px-2 py-3 transition-colors hover:bg-gray-50"
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
