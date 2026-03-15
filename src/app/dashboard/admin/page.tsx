import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Header } from "@/components/layout/header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
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
  ]);

  const profiles = (profilesResult.data ?? []) as ProfileRow[];
  const workspaces = (workspacesResult.data ?? []) as WorkspaceRow[];
  const slackIntegrations = (slackResult.data ?? []) as SlackRow[];
  const memberships = (membershipsResult.data ?? []) as MembershipRow[];
  const recentReports = (reportsResult.data ?? []) as ReportRow[];

  // Build lookup maps
  const workspaceMap = new Map(workspaces.map((w) => [w.id, w]));
  const profileMap = new Map(profiles.map((p) => [p.id, p]));
  const slackByWorkspace = new Map(slackIntegrations.map((s) => [s.workspace_id, s]));

  // Stats
  const totalUsers = profiles.length;
  const totalWorkspaces = workspaces.length;
  const totalSlack = slackIntegrations.length;
  const totalReports = recentReports.length;

  // Users with Slack: find users whose workspace has slack
  const usersWithSlack = new Set<string>();
  for (const m of memberships) {
    if (slackByWorkspace.has(m.workspace_id)) {
      usersWithSlack.add(m.user_id);
    }
  }

  // Today's signups
  const today = format(new Date(), "yyyy-MM-dd");
  const todaySignups = profiles.filter((p) => p.created_at.startsWith(today));

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
          <SummaryCard label="総ユーザー数" value={totalUsers} sub={`今日 +${todaySignups.length}`} color="blue" />
          <SummaryCard label="ワークスペース" value={totalWorkspaces} color="purple" />
          <SummaryCard label="Slack連携済み" value={totalSlack} sub={`${usersWithSlack.size}人が利用`} color="green" />
          <SummaryCard label="直近の日報" value={totalReports} sub="最大50件表示" color="amber" />
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
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-3 pr-4 font-medium">ユーザー</th>
                    <th className="pb-3 pr-4 font-medium">メール</th>
                    <th className="pb-3 pr-4 font-medium">ワークスペース</th>
                    <th className="pb-3 pr-4 font-medium">Slack</th>
                    <th className="pb-3 font-medium">登録日</th>
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
                      <tr key={profile.id} className="border-b last:border-0">
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600">
                              {(profile.display_name || profile.email)[0]?.toUpperCase()}
                            </div>
                            <span className="font-medium text-gray-900">
                              {profile.display_name || "-"}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 pr-4 text-gray-600">
                          {profile.email}
                        </td>
                        <td className="py-3 pr-4">
                          {userWorkspaces.map((ws) => (
                            <div key={ws.id} className="flex items-center gap-1.5">
                              <span className="text-gray-900">{ws.name}</span>
                              <Badge variant={planVariant(ws.plan)} className="text-[10px]">
                                {ws.plan}
                              </Badge>
                            </div>
                          ))}
                          {userWorkspaces.length === 0 && (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="py-3 pr-4">
                          {hasSlack ? (
                            <Badge variant="success">連携済み</Badge>
                          ) : (
                            <Badge variant="secondary">未連携</Badge>
                          )}
                        </td>
                        <td className="py-3 text-gray-500">
                          {formatFullDate(profile.created_at)}
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
              <p className="text-sm text-gray-500">まだSlack連携はありません</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-gray-500">
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
                      const channelCount = slack.selected_channel_ids?.length ?? 0;

                      return (
                        <tr key={slack.id} className="border-b last:border-0">
                          <td className="py-3 pr-4 font-medium text-gray-900">
                            {slack.slack_team_name || slack.slack_team_id}
                          </td>
                          <td className="py-3 pr-4 text-gray-600">
                            {ws?.name ?? "-"}
                          </td>
                          <td className="py-3 pr-4">
                            <Badge variant={channelCount > 0 ? "success" : "secondary"}>
                              {channelCount}ch
                            </Badge>
                          </td>
                          <td className="py-3 pr-4 text-gray-600">
                            {installer?.display_name || installer?.email || "-"}
                          </td>
                          <td className="py-3 text-gray-500">
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
              <p className="text-sm text-gray-500">まだ日報はありません</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-gray-500">
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
                        <tr key={report.id} className="border-b last:border-0">
                          <td className="py-3 pr-4 font-medium text-gray-900">
                            {reportUser?.display_name || reportUser?.email || "-"}
                          </td>
                          <td className="py-3 pr-4 text-gray-600">
                            {ws?.name ?? "-"}
                          </td>
                          <td className="py-3 pr-4 text-gray-900">
                            {report.report_date}
                          </td>
                          <td className="py-3 pr-4">
                            <Badge variant={statusVariant(report.status)}>
                              {report.status}
                            </Badge>
                          </td>
                          <td className="py-3 text-gray-500">
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
    blue: "bg-blue-50 text-blue-700",
    purple: "bg-purple-50 text-purple-700",
    green: "bg-green-50 text-green-700",
    amber: "bg-amber-50 text-amber-700",
  };

  return (
    <Card>
      <div className="p-5">
        <p className="text-sm text-gray-500">{label}</p>
        <p className={`mt-1 text-3xl font-bold ${colorMap[color].split(" ")[1]}`}>
          {value}
        </p>
        {sub && <p className="mt-1 text-xs text-gray-400">{sub}</p>}
      </div>
    </Card>
  );
}
