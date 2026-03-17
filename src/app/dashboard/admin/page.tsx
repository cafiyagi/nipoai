import { redirect } from "next/navigation";
import {
  Eye,
  MousePointerClick,
  LogOut as LogOutIcon,
  Globe,
  Cpu,
  DollarSign,
  TrendingUp,
  Zap,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Header } from "@/components/layout/header";
import { AdminUserDeleteButton } from "./admin-user-delete-button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, startOfDay, subDays } from "date-fns";
import { ja } from "date-fns/locale";

const SUPER_ADMIN_EMAILS = ["cafiyagi@gmail.com"];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ProfileRow {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

interface WorkspaceRow {
  id: string;
  name: string;
  slug: string;
  plan: string;
  created_at: string;
}

interface SlackRow {
  id: string;
  workspace_id: string;
  slack_team_id: string;
  slack_team_name: string | null;
  selected_channel_ids: string[];
  installed_by: string | null;
  created_at: string;
}

interface MembershipRow {
  id: string;
  user_id: string;
  workspace_id: string;
  role: string;
  created_at: string;
}

interface ReportRow {
  id: string;
  workspace_id: string;
  user_id: string;
  report_date: string;
  status: string;
  created_at: string;
}

interface PageViewRow {
  session_id: string;
  path: string;
  created_at: string;
}

interface AiUsageRow {
  workspace_id: string;
  token_usage: number | null;
  ai_model: string | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Analytics helpers
// ---------------------------------------------------------------------------

function computeAnalytics(views: PageViewRow[]) {
  const now = new Date();
  const todayStart = startOfDay(now).toISOString();

  // Today's views
  const todayViews = views.filter((v) => v.created_at >= todayStart);
  const todayUniqueSessions = new Set(todayViews.map((v) => v.session_id)).size;
  const todayPageViews = todayViews.length;

  // Total unique sessions (all time)
  const totalUniqueSessions = new Set(views.map((v) => v.session_id)).size;
  const totalPageViews = views.length;

  // Bounce rate: sessions that only visited 1 page
  const sessionPages = new Map<string, Set<string>>();
  for (const v of views) {
    if (!sessionPages.has(v.session_id)) {
      sessionPages.set(v.session_id, new Set());
    }
    sessionPages.get(v.session_id)!.add(v.path);
  }
  const totalSessions = sessionPages.size;
  const bouncedSessions = [...sessionPages.values()].filter(
    (pages) => pages.size === 1,
  ).length;
  const bounceRate =
    totalSessions > 0 ? Math.round((bouncedSessions / totalSessions) * 100) : 0;

  // Today's bounce
  const todaySessionPages = new Map<string, Set<string>>();
  for (const v of todayViews) {
    if (!todaySessionPages.has(v.session_id)) {
      todaySessionPages.set(v.session_id, new Set());
    }
    todaySessionPages.get(v.session_id)!.add(v.path);
  }
  const todayTotalSessions = todaySessionPages.size;
  const todayBounced = [...todaySessionPages.values()].filter(
    (pages) => pages.size === 1,
  ).length;
  const todayBounceRate =
    todayTotalSessions > 0
      ? Math.round((todayBounced / todayTotalSessions) * 100)
      : 0;

  // Funnel: LP → signup → dashboard
  const funnelLP = new Set(
    views.filter((v) => v.path === "/").map((v) => v.session_id),
  ).size;
  const funnelSignup = new Set(
    views.filter((v) => v.path === "/signup").map((v) => v.session_id),
  ).size;
  const funnelLogin = new Set(
    views.filter((v) => v.path === "/login").map((v) => v.session_id),
  ).size;
  const funnelDashboard = new Set(
    views
      .filter((v) => v.path.startsWith("/dashboard"))
      .map((v) => v.session_id),
  ).size;

  // Top pages today
  const todayPageCounts = new Map<string, number>();
  for (const v of todayViews) {
    todayPageCounts.set(v.path, (todayPageCounts.get(v.path) ?? 0) + 1);
  }
  const topPages = [...todayPageCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  // Daily visitors (last 7 days)
  const dailyVisitors: { date: string; visitors: number; views: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const day = subDays(now, i);
    const dayStr = format(day, "yyyy-MM-dd");
    const dayLabel = format(day, "M/d（E）", { locale: ja });
    const dayViews = views.filter((v) => v.created_at.startsWith(dayStr));
    const dayUnique = new Set(dayViews.map((v) => v.session_id)).size;
    dailyVisitors.push({
      date: dayLabel,
      visitors: dayUnique,
      views: dayViews.length,
    });
  }

  return {
    todayUniqueSessions,
    todayPageViews,
    todayBounceRate,
    todayBounced,
    todayTotalSessions,
    totalUniqueSessions,
    totalPageViews,
    bounceRate,
    bouncedSessions,
    totalSessions,
    funnelLP,
    funnelSignup,
    funnelLogin,
    funnelDashboard,
    topPages,
    dailyVisitors,
  };
}

// ---------------------------------------------------------------------------
// AI cost helpers
// ---------------------------------------------------------------------------

// GPT-4o-mini pricing (USD per 1M tokens, blended input/output estimate)
const GPT4O_MINI_COST_PER_TOKEN = 0.3 / 1_000_000; // ~$0.30/1M blended
const USD_JPY_RATE = 150; // approximate

function computeAiUsage(
  dailyUsage: AiUsageRow[],
  weeklyUsage: AiUsageRow[],
  workspaceMap: Map<string, WorkspaceRow>,
) {
  const allUsage = [...dailyUsage, ...weeklyUsage];

  const now = new Date();
  const monthStart = format(now, "yyyy-MM-01");

  let totalTokens = 0;
  let monthTokens = 0;
  let totalDailyCount = dailyUsage.length;
  let totalWeeklyCount = weeklyUsage.length;

  // Per-workspace aggregation
  const workspaceTokens = new Map<string, { tokens: number; count: number }>();

  // Daily aggregation (last 30 days)
  const dailyTokenMap = new Map<string, number>();

  for (const row of allUsage) {
    const tokens = row.token_usage ?? 0;
    totalTokens += tokens;

    if (row.created_at >= monthStart) {
      monthTokens += tokens;
    }

    // Per-workspace
    const ws = workspaceTokens.get(row.workspace_id) ?? { tokens: 0, count: 0 };
    ws.tokens += tokens;
    ws.count += 1;
    workspaceTokens.set(row.workspace_id, ws);

    // Daily chart
    const dayKey = row.created_at.slice(0, 10);
    dailyTokenMap.set(dayKey, (dailyTokenMap.get(dayKey) ?? 0) + tokens);
  }

  // Build daily chart data (last 30 days)
  const dailyChart: { date: string; tokens: number; cost: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const day = subDays(now, i);
    const dayStr = format(day, "yyyy-MM-dd");
    const dayLabel = format(day, "M/d", { locale: ja });
    const tokens = dailyTokenMap.get(dayStr) ?? 0;
    dailyChart.push({
      date: dayLabel,
      tokens,
      cost: tokens * GPT4O_MINI_COST_PER_TOKEN,
    });
  }

  // Per-workspace sorted by usage
  const workspaceBreakdown = [...workspaceTokens.entries()]
    .map(([wsId, data]) => ({
      workspace: workspaceMap.get(wsId),
      ...data,
      cost: data.tokens * GPT4O_MINI_COST_PER_TOKEN,
    }))
    .sort((a, b) => b.tokens - a.tokens);

  const totalCostUsd = totalTokens * GPT4O_MINI_COST_PER_TOKEN;
  const monthCostUsd = monthTokens * GPT4O_MINI_COST_PER_TOKEN;

  return {
    totalTokens,
    monthTokens,
    totalCostUsd,
    monthCostUsd,
    totalCostJpy: totalCostUsd * USD_JPY_RATE,
    monthCostJpy: monthCostUsd * USD_JPY_RATE,
    totalDailyCount,
    totalWeeklyCount,
    dailyChart,
    workspaceBreakdown,
  };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !SUPER_ADMIN_EMAILS.includes(user.email ?? "")) {
    redirect("/dashboard");
  }

  const admin = createAdminClient();

  const [
    profilesResult,
    workspacesResult,
    slackResult,
    membershipsResult,
    reportsResult,
    pageViewsResult,
    aiDailyUsageResult,
    aiWeeklyUsageResult,
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
      .limit(50),
    (admin as unknown as { from: (table: string) => { select: (cols: string) => { gte: (col: string, val: string) => { order: (col: string, opts: { ascending: boolean }) => { limit: (n: number) => Promise<{ data: PageViewRow[] | null }> } } } } })
      .from("page_views")
      .select("session_id, path, created_at")
      .gte("created_at", subDays(new Date(), 30).toISOString())
      .order("created_at", { ascending: false })
      .limit(10000),
    admin
      .from("daily_reports")
      .select("workspace_id, token_usage, ai_model, created_at")
      .not("token_usage", "is", null)
      .order("created_at", { ascending: false }),
    admin
      .from("weekly_reports")
      .select("workspace_id, token_usage, ai_model, created_at")
      .not("token_usage", "is", null)
      .order("created_at", { ascending: false }),
  ]);

  const profiles = (profilesResult.data ?? []) as ProfileRow[];
  const workspaces = (workspacesResult.data ?? []) as WorkspaceRow[];
  const slackIntegrations = (slackResult.data ?? []) as SlackRow[];
  const memberships = (membershipsResult.data ?? []) as MembershipRow[];
  const recentReports = (reportsResult.data ?? []) as ReportRow[];
  const pageViews = (pageViewsResult.data ?? []) as PageViewRow[];
  const aiDailyUsage = (aiDailyUsageResult.data ?? []) as AiUsageRow[];
  const aiWeeklyUsage = (aiWeeklyUsageResult.data ?? []) as AiUsageRow[];

  // Build lookup maps
  const workspaceMap = new Map(workspaces.map((w) => [w.id, w]));
  const profileMap = new Map(profiles.map((p) => [p.id, p]));
  const slackByWorkspace = new Map(
    slackIntegrations.map((s) => [s.workspace_id, s]),
  );

  // Stats
  const totalUsers = profiles.length;
  const totalWorkspaces = workspaces.length;
  const totalSlack = slackIntegrations.length;
  const totalReports = recentReports.length;

  // Users with Slack
  const usersWithSlack = new Set<string>();
  for (const m of memberships) {
    if (slackByWorkspace.has(m.workspace_id)) {
      usersWithSlack.add(m.user_id);
    }
  }

  // Today's signups
  const today = format(new Date(), "yyyy-MM-dd");
  const todaySignups = profiles.filter((p) => p.created_at.startsWith(today));

  // Analytics
  const analytics = computeAnalytics(pageViews);

  // AI usage
  const aiUsage = computeAiUsage(aiDailyUsage, aiWeeklyUsage, workspaceMap);

  function formatDate(dateStr: string) {
    try {
      return format(new Date(dateStr), "M/d HH:mm", { locale: ja });
    } catch {
      return dateStr;
    }
  }

  function formatFullDate(dateStr: string) {
    try {
      return format(new Date(dateStr), "yyyy/M/d HH:mm", { locale: ja });
    } catch {
      return dateStr;
    }
  }

  const planVariant = (plan: string) => {
    switch (plan) {
      case "team":
        return "default" as const;
      case "starter":
        return "success" as const;
      default:
        return "secondary" as const;
    }
  };

  const statusVariant = (status: string) => {
    switch (status) {
      case "submitted":
      case "delivered":
        return "success" as const;
      case "draft":
        return "default" as const;
      case "generating":
        return "outline" as const;
      default:
        return "secondary" as const;
    }
  };

  return (
    <div>
      <Header title="管理者ダッシュボード" />

      <div className="p-6 space-y-6">
        {/* Summary cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard
            label="総ユーザー数"
            value={totalUsers}
            sub={`今日 +${todaySignups.length}`}
            color="blue"
          />
          <SummaryCard
            label="ワークスペース"
            value={totalWorkspaces}
            color="purple"
          />
          <SummaryCard
            label="Slack連携済み"
            value={totalSlack}
            sub={`${usersWithSlack.size}人が利用`}
            color="green"
          />
          <SummaryCard
            label="直近の日報"
            value={totalReports}
            sub="最大50件表示"
            color="amber"
          />
        </div>

        {/* ================================================================= */}
        {/* Analytics Section                                                 */}
        {/* ================================================================= */}

        {/* Analytics summary cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <AnalyticsCard
            icon={<Eye className="h-4 w-4" />}
            label="今日の訪問者"
            value={analytics.todayUniqueSessions}
            sub={`${analytics.todayPageViews} PV`}
          />
          <AnalyticsCard
            icon={<Globe className="h-4 w-4" />}
            label="累計訪問者"
            value={analytics.totalUniqueSessions}
            sub={`${analytics.totalPageViews} PV（30日間）`}
          />
          <AnalyticsCard
            icon={<LogOutIcon className="h-4 w-4" />}
            label="今日の直帰率"
            value={`${analytics.todayBounceRate}%`}
            sub={`${analytics.todayBounced}/${analytics.todayTotalSessions}人が離脱`}
          />
          <AnalyticsCard
            icon={<MousePointerClick className="h-4 w-4" />}
            label="全体の直帰率"
            value={`${analytics.bounceRate}%`}
            sub={`${analytics.bouncedSessions}/${analytics.totalSessions}セッション`}
          />
        </div>

        {/* Funnel + Top Pages + Daily Visitors */}
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Funnel */}
          <Card>
            <CardHeader>
              <CardTitle>ファネル分析（30日間）</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <FunnelStep
                  label="LP（/）"
                  value={analytics.funnelLP}
                  max={analytics.funnelLP}
                />
                <FunnelStep
                  label="サインアップ"
                  value={analytics.funnelSignup}
                  max={analytics.funnelLP}
                />
                <FunnelStep
                  label="ログイン"
                  value={analytics.funnelLogin}
                  max={analytics.funnelLP}
                />
                <FunnelStep
                  label="ダッシュボード"
                  value={analytics.funnelDashboard}
                  max={analytics.funnelLP}
                />
              </div>
              {analytics.funnelLP > 0 && (
                <p className="mt-4 text-xs text-[var(--text-muted)]">
                  LP → サインアップ転換率:{" "}
                  <span className="font-semibold text-[var(--accent)]">
                    {Math.round(
                      (analytics.funnelSignup / analytics.funnelLP) * 100,
                    )}
                    %
                  </span>
                </p>
              )}
            </CardContent>
          </Card>

          {/* Top Pages Today */}
          <Card>
            <CardHeader>
              <CardTitle>今日のページ別PV</CardTitle>
            </CardHeader>
            <CardContent>
              {analytics.topPages.length === 0 ? (
                <p className="text-sm text-[var(--text-muted)]">
                  まだデータがありません
                </p>
              ) : (
                <div className="space-y-2">
                  {analytics.topPages.map(([path, count]) => (
                    <div
                      key={path}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="truncate text-[var(--text-secondary)]">
                        {path}
                      </span>
                      <span className="ml-2 shrink-0 font-medium text-[var(--text-primary)]">
                        {count}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Daily Visitors (7 days) */}
          <Card>
            <CardHeader>
              <CardTitle>日別訪問者数（7日間）</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {analytics.dailyVisitors.map((day) => {
                  const max = Math.max(
                    ...analytics.dailyVisitors.map((d) => d.visitors),
                    1,
                  );
                  const pct = Math.round((day.visitors / max) * 100);
                  return (
                    <div key={day.date} className="flex items-center gap-3">
                      <span className="w-24 shrink-0 text-xs text-[var(--text-muted)]">
                        {day.date}
                      </span>
                      <div className="flex-1">
                        <div
                          className="h-5 rounded bg-[var(--accent)] transition-all"
                          style={{ width: `${Math.max(pct, 2)}%` }}
                        />
                      </div>
                      <span className="w-12 shrink-0 text-right text-xs font-medium text-[var(--text-primary)]">
                        {day.visitors}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ================================================================= */}
        {/* AI Usage Section                                                */}
        {/* ================================================================= */}

        <h2 className="text-lg font-semibold text-[var(--text-primary)] pt-2">
          AI利用状況
        </h2>

        {/* AI summary cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <AnalyticsCard
            icon={<Cpu className="h-4 w-4" />}
            label="今月のトークン数"
            value={aiUsage.monthTokens.toLocaleString()}
            sub={`${aiUsage.totalDailyCount + aiUsage.totalWeeklyCount} 件のレポート（全期間）`}
          />
          <AnalyticsCard
            icon={<DollarSign className="h-4 w-4" />}
            label="今月の推定コスト"
            value={`¥${Math.round(aiUsage.monthCostJpy).toLocaleString()}`}
            sub={`$${aiUsage.monthCostUsd.toFixed(4)} USD`}
          />
          <AnalyticsCard
            icon={<TrendingUp className="h-4 w-4" />}
            label="全期間トークン数"
            value={aiUsage.totalTokens.toLocaleString()}
            sub={`日報 ${aiUsage.totalDailyCount}件 / 週報 ${aiUsage.totalWeeklyCount}件`}
          />
          <AnalyticsCard
            icon={<Zap className="h-4 w-4" />}
            label="全期間コスト"
            value={`¥${Math.round(aiUsage.totalCostJpy).toLocaleString()}`}
            sub={`$${aiUsage.totalCostUsd.toFixed(4)} USD（GPT-4o-mini）`}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {/* Daily token usage chart (30 days) */}
          <Card>
            <CardHeader>
              <CardTitle>日別トークン使用量（30日間）</CardTitle>
            </CardHeader>
            <CardContent>
              {aiUsage.dailyChart.every((d) => d.tokens === 0) ? (
                <p className="text-sm text-[var(--text-muted)]">
                  まだデータがありません
                </p>
              ) : (
                <div className="space-y-1">
                  {aiUsage.dailyChart
                    .filter((_, i) => i % 3 === 0 || i >= 27)
                    .map((day) => {
                      const max = Math.max(
                        ...aiUsage.dailyChart.map((d) => d.tokens),
                        1,
                      );
                      const pct = Math.round((day.tokens / max) * 100);
                      return (
                        <div key={day.date} className="flex items-center gap-3">
                          <span className="w-12 shrink-0 text-xs text-[var(--text-muted)]">
                            {day.date}
                          </span>
                          <div className="flex-1">
                            <div
                              className="h-4 rounded bg-[var(--accent)] transition-all"
                              style={{ width: `${Math.max(pct, 1)}%` }}
                            />
                          </div>
                          <span className="w-20 shrink-0 text-right text-xs font-medium text-[var(--text-primary)]">
                            {day.tokens > 0
                              ? day.tokens.toLocaleString()
                              : "-"}
                          </span>
                        </div>
                      );
                    })}
                </div>
              )}
              <p className="mt-3 text-xs text-[var(--text-muted)]">
                ※ コスト推定: GPT-4o-mini $0.30/1M tokens（input/output平均）、1USD = ¥{USD_JPY_RATE}
              </p>
            </CardContent>
          </Card>

          {/* Per-workspace breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>ワークスペース別 AI利用量</CardTitle>
            </CardHeader>
            <CardContent>
              {aiUsage.workspaceBreakdown.length === 0 ? (
                <p className="text-sm text-[var(--text-muted)]">
                  まだデータがありません
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-[var(--text-secondary)]">
                        <th className="pb-3 pr-4 font-medium">ワークスペース</th>
                        <th className="pb-3 pr-4 font-medium text-right">レポート数</th>
                        <th className="pb-3 pr-4 font-medium text-right">トークン</th>
                        <th className="pb-3 font-medium text-right">推定コスト</th>
                      </tr>
                    </thead>
                    <tbody>
                      {aiUsage.workspaceBreakdown.map((row) => (
                        <tr
                          key={row.workspace?.id ?? "unknown"}
                          className="border-b last:border-0"
                        >
                          <td className="py-3 pr-4 font-medium text-[var(--text-primary)]">
                            {row.workspace?.name ?? "不明"}
                            {row.workspace && (
                              <Badge
                                variant={planVariant(row.workspace.plan)}
                                className="ml-2 text-[10px]"
                              >
                                {row.workspace.plan}
                              </Badge>
                            )}
                          </td>
                          <td className="py-3 pr-4 text-right text-[var(--text-secondary)]">
                            {row.count}
                          </td>
                          <td className="py-3 pr-4 text-right text-[var(--text-primary)]">
                            {row.tokens.toLocaleString()}
                          </td>
                          <td className="py-3 text-right text-[var(--text-secondary)]">
                            ¥{Math.round(row.cost * USD_JPY_RATE).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Users table */}
        <Card>
          <CardHeader>
            <CardTitle>ユーザー一覧</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-[var(--text-secondary)]">
                    <th className="pb-3 pr-4 font-medium">ユーザー</th>
                    <th className="pb-3 pr-4 font-medium">メール</th>
                    <th className="pb-3 pr-4 font-medium">ワークスペース</th>
                    <th className="pb-3 pr-4 font-medium">Slack</th>
                    <th className="pb-3 pr-4 font-medium">登録日</th>
                    <th className="pb-3 font-medium">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {profiles.map((profile) => {
                    const userMemberships = memberships.filter(
                      (m) => m.user_id === profile.id,
                    );
                    const userWorkspaces = userMemberships
                      .map((m) => workspaceMap.get(m.workspace_id))
                      .filter(Boolean) as WorkspaceRow[];
                    const hasSlack = usersWithSlack.has(profile.id);

                    return (
                      <tr
                        key={profile.id}
                        className="border-b last:border-0"
                      >
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-[var(--bg-hover)] flex items-center justify-center text-xs font-medium text-[var(--text-secondary)]">
                              {(
                                profile.display_name || profile.email
                              )[0]?.toUpperCase()}
                            </div>
                            <span className="font-medium text-[var(--text-primary)]">
                              {profile.display_name || "-"}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 pr-4 text-[var(--text-secondary)]">
                          {profile.email}
                        </td>
                        <td className="py-3 pr-4">
                          {userWorkspaces.map((ws) => (
                            <div
                              key={ws.id}
                              className="flex items-center gap-1.5"
                            >
                              <span className="text-[var(--text-primary)]">
                                {ws.name}
                              </span>
                              <Badge
                                variant={planVariant(ws.plan)}
                                className="text-[10px]"
                              >
                                {ws.plan}
                              </Badge>
                            </div>
                          ))}
                          {userWorkspaces.length === 0 && (
                            <span className="text-[var(--text-muted)]">-</span>
                          )}
                        </td>
                        <td className="py-3 pr-4">
                          {hasSlack ? (
                            <Badge variant="success">連携済み</Badge>
                          ) : (
                            <Badge variant="secondary">未連携</Badge>
                          )}
                        </td>
                        <td className="py-3 pr-4 text-[var(--text-secondary)]">
                          {formatFullDate(profile.created_at)}
                        </td>
                        <td className="py-3">
                          {!SUPER_ADMIN_EMAILS.includes(profile.email) && (
                            <AdminUserDeleteButton
                              userId={profile.id}
                              displayName={profile.display_name || profile.email}
                            />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Slack integrations */}
        <Card>
          <CardHeader>
            <CardTitle>Slack連携一覧</CardTitle>
          </CardHeader>
          <CardContent>
            {slackIntegrations.length === 0 ? (
              <p className="text-sm text-[var(--text-secondary)]">
                まだSlack連携はありません
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-[var(--text-secondary)]">
                      <th className="pb-3 pr-4 font-medium">Slackチーム</th>
                      <th className="pb-3 pr-4 font-medium">ワークスペース</th>
                      <th className="pb-3 pr-4 font-medium">チャンネル数</th>
                      <th className="pb-3 pr-4 font-medium">連携者</th>
                      <th className="pb-3 font-medium">連携日</th>
                    </tr>
                  </thead>
                  <tbody>
                    {slackIntegrations.map((slack) => {
                      const ws = workspaceMap.get(slack.workspace_id);
                      const installer = slack.installed_by
                        ? profileMap.get(slack.installed_by)
                        : null;
                      const channelCount =
                        slack.selected_channel_ids?.length ?? 0;

                      return (
                        <tr
                          key={slack.id}
                          className="border-b last:border-0"
                        >
                          <td className="py-3 pr-4 font-medium text-[var(--text-primary)]">
                            {slack.slack_team_name || slack.slack_team_id}
                          </td>
                          <td className="py-3 pr-4 text-[var(--text-secondary)]">
                            {ws?.name ?? "-"}
                          </td>
                          <td className="py-3 pr-4">
                            <Badge
                              variant={
                                channelCount > 0 ? "success" : "secondary"
                              }
                            >
                              {channelCount}ch
                            </Badge>
                          </td>
                          <td className="py-3 pr-4 text-[var(--text-secondary)]">
                            {installer?.display_name ||
                              installer?.email ||
                              "-"}
                          </td>
                          <td className="py-3 text-[var(--text-secondary)]">
                            {formatFullDate(slack.created_at)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent reports */}
        <Card>
          <CardHeader>
            <CardTitle>最近の日報（直近50件）</CardTitle>
          </CardHeader>
          <CardContent>
            {recentReports.length === 0 ? (
              <p className="text-sm text-[var(--text-secondary)]">
                まだ日報はありません
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-[var(--text-secondary)]">
                      <th className="pb-3 pr-4 font-medium">ユーザー</th>
                      <th className="pb-3 pr-4 font-medium">ワークスペース</th>
                      <th className="pb-3 pr-4 font-medium">日付</th>
                      <th className="pb-3 pr-4 font-medium">ステータス</th>
                      <th className="pb-3 font-medium">作成日時</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentReports.map((report) => {
                      const reportUser = profileMap.get(report.user_id);
                      const ws = workspaceMap.get(report.workspace_id);

                      return (
                        <tr
                          key={report.id}
                          className="border-b last:border-0"
                        >
                          <td className="py-3 pr-4 font-medium text-[var(--text-primary)]">
                            {reportUser?.display_name ||
                              reportUser?.email ||
                              "-"}
                          </td>
                          <td className="py-3 pr-4 text-[var(--text-secondary)]">
                            {ws?.name ?? "-"}
                          </td>
                          <td className="py-3 pr-4 text-[var(--text-primary)]">
                            {report.report_date}
                          </td>
                          <td className="py-3 pr-4">
                            <Badge variant={statusVariant(report.status)}>
                              {report.status}
                            </Badge>
                          </td>
                          <td className="py-3 text-[var(--text-secondary)]">
                            {formatDate(report.created_at)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Summary card component
// ---------------------------------------------------------------------------

function SummaryCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: number;
  sub?: string;
  color: "blue" | "purple" | "green" | "amber";
}) {
  const colorMap = {
    blue: "bg-[var(--accent-bg)] text-[var(--accent)]",
    purple: "bg-[var(--icon-bg-purple)] text-[var(--icon-text-purple)]",
    green: "bg-[var(--success-bg)] text-[var(--success)]",
    amber: "bg-[var(--icon-bg-amber)] text-[var(--icon-text-amber)]",
  };

  return (
    <Card>
      <div className="p-5">
        <p className="text-sm text-[var(--text-secondary)]">{label}</p>
        <p
          className={`mt-1 text-3xl font-bold ${colorMap[color].split(" ")[1]}`}
        >
          {value}
        </p>
        {sub && (
          <p className="mt-1 text-xs text-[var(--text-muted)]">{sub}</p>
        )}
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Analytics card component
// ---------------------------------------------------------------------------

function AnalyticsCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  sub?: string;
}) {
  return (
    <Card>
      <div className="p-5">
        <div className="flex items-center gap-2 text-[var(--text-muted)]">
          {icon}
          <p className="text-sm">{label}</p>
        </div>
        <p className="mt-2 text-3xl font-bold text-[var(--text-primary)]">
          {value}
        </p>
        {sub && (
          <p className="mt-1 text-xs text-[var(--text-muted)]">{sub}</p>
        )}
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Funnel step component
// ---------------------------------------------------------------------------

function FunnelStep({
  label,
  value,
  max,
}: {
  label: string;
  value: number;
  max: number;
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;

  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="text-[var(--text-secondary)]">{label}</span>
        <span className="font-medium text-[var(--text-primary)]">
          {value}人
          {max > 0 && value < max && (
            <span className="ml-1 text-xs text-[var(--text-muted)]">
              ({pct}%)
            </span>
          )}
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-[var(--bg-hover)]">
        <div
          className="h-2 rounded-full bg-[var(--accent)] transition-all"
          style={{ width: `${Math.max(pct, 2)}%` }}
        />
      </div>
    </div>
  );
}
