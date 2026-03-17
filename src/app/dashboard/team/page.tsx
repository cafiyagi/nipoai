import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { getWorkspaceContext } from "@/lib/dashboard/get-workspace-context";
import { TeamActions } from "./team-actions";
import { MemberRoleSelect } from "./member-role-select";
import { OneOnOneButton } from "./one-on-one-button";
import { checkPlanFeature } from "@/lib/plan-gate";

import type {
  UserWorkspaceMembership,
  Profile,
  DailyReport,
  Plan,
} from "@/lib/supabase/types";

type MemberWithProfile = Pick<UserWorkspaceMembership, "id" | "role" | "user_id" | "created_at"> & {
  profiles: Pick<Profile, "id" | "email" | "display_name" | "avatar_url">;
};

interface MemberDisplay {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: "admin" | "member";
  lastReport: string | null;
}

export default async function TeamPage() {
  const { user, supabase, workspaceId, isAdmin } =
    await getWorkspaceContext();

  // Fetch members and reports in parallel
  const [membersResult, reportsResult] = await Promise.all([
    supabase
      .from("user_workspace_memberships")
      .select(
        "id, user_id, role, created_at, profiles!user_workspace_memberships_user_id_profiles_fkey(id, email, display_name, avatar_url)",
      )
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: true }),
    supabase
      .from("daily_reports")
      .select("user_id, report_date")
      .eq("workspace_id", workspaceId)
      .order("report_date", { ascending: false }),
  ]);

  // Fetch workspace plan
  const { data: rawWorkspace } = await supabase
    .from("workspaces")
    .select("plan")
    .eq("id", workspaceId)
    .single();
  const workspacePlan = ((rawWorkspace as unknown as { plan: Plan } | null)?.plan ?? "free") as Plan;
  const oneOnOneAllowed = checkPlanFeature(workspacePlan, "oneOnOneAgenda");

  const membersRaw = (membersResult.data ?? []) as unknown as MemberWithProfile[];

  // Build latest report map
  const latestReportMap: Record<string, string> = {};
  const reports = (reportsResult.data ?? []) as Pick<
    DailyReport,
    "user_id" | "report_date"
  >[];

  for (const report of reports) {
    if (!latestReportMap[report.user_id]) {
      latestReportMap[report.user_id] = report.report_date;
    }
  }

  // Build display data
  const members: MemberDisplay[] = membersRaw.map((m) => {
    const lastReportDate = latestReportMap[m.user_id] ?? null;
    return {
      id: m.id,
      userId: m.user_id,
      name: m.profiles?.display_name ?? m.profiles?.email ?? "不明",
      email: m.profiles?.email ?? "",
      role: m.role,
      lastReport: lastReportDate
        ? format(new Date(lastReportDate), "yyyy年M月d日", { locale: ja })
        : null,
    };
  });

  return (
    <div>
      <Header title="チーム" />

      <div className="p-6">
        {/* Header with invite button */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              メンバー一覧
            </h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              {members.length}人のメンバー
            </p>
          </div>
          <TeamActions workspaceId={workspaceId} isAdmin={isAdmin} />
        </div>

        {/* Members table */}
        <Card>
          <CardContent className="p-0">
            {members.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <p className="text-sm text-[var(--text-secondary)]">
                  メンバーがいません。招待してチームを作りましょう。
                </p>
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden sm:block">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[var(--border-primary)]">
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
                          メンバー
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
                          ロール
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
                          最終日報日
                        </th>
                        {isAdmin && (
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
                            1on1
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-primary)]">
                      {members.map((member) => (
                        <tr key={member.id} className="hover:bg-[var(--bg-hover)]">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <Avatar name={member.name} size="sm" />
                              <div>
                                <p className="text-sm font-medium text-[var(--text-primary)]">
                                  {member.name}
                                </p>
                                <p className="text-sm text-[var(--text-secondary)]">
                                  {member.email}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <MemberRoleSelect
                              workspaceId={workspaceId}
                              membershipId={member.id}
                              memberName={member.name}
                              currentRole={member.role}
                              isSelf={member.userId === user.id}
                              isAdmin={isAdmin}
                            />
                          </td>
                          <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">
                            {member.lastReport ?? "未提出"}
                          </td>
                          {isAdmin && (
                            <td className="px-6 py-4">
                              <OneOnOneButton
                                targetUserId={member.userId}
                                memberName={member.name}
                                isAdmin={isAdmin}
                                planAllowed={oneOnOneAllowed}
                              />
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile list */}
                <div className="flex flex-col divide-y divide-[var(--border-primary)] sm:hidden">
                  {members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center gap-3 p-4"
                    >
                      <Avatar name={member.name} size="sm" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-medium text-[var(--text-primary)]">
                            {member.name}
                          </p>
                          <MemberRoleSelect
                            workspaceId={workspaceId}
                            membershipId={member.id}
                            memberName={member.name}
                            currentRole={member.role}
                            isSelf={member.userId === user.id}
                            isAdmin={isAdmin}
                          />
                        </div>
                        <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
                          最終日報: {member.lastReport ?? "未提出"}
                        </p>
                        <div className="mt-2">
                          <OneOnOneButton
                            targetUserId={member.userId}
                            memberName={member.name}
                            isAdmin={isAdmin}
                            planAllowed={oneOnOneAllowed}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
