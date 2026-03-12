import { redirect } from "next/navigation";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { createClient } from "@/lib/supabase/server";
import { TeamActions } from "./team-actions";
import { MemberRoleSelect } from "./member-role-select";

import type {
  UserWorkspaceMembership,
  Profile,
  DailyReport,
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
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Get the user's first workspace membership
  const { data: rawMyMembership } = await supabase
    .from("user_workspace_memberships")
    .select("workspace_id, role")
    .eq("user_id", user.id)
    .limit(1)
    .single();

  if (!rawMyMembership) {
    redirect("/onboarding");
  }

  const myMembership = rawMyMembership as Pick<
    UserWorkspaceMembership,
    "workspace_id" | "role"
  >;
  const workspaceId = myMembership.workspace_id;
  const isAdmin = myMembership.role === "admin";

  // Fetch all members with profiles
  const { data: rawMembers } = await supabase
    .from("user_workspace_memberships")
    .select(
      "id, user_id, role, created_at, profiles!user_workspace_memberships_user_id_profiles_fkey(id, email, display_name, avatar_url)",
    )
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: true });

  const membersRaw = (rawMembers ?? []) as unknown as MemberWithProfile[];

  // Get latest report date for each member
  const memberUserIds = membersRaw.map((m) => m.user_id);

  let latestReportMap: Record<string, string> = {};

  if (memberUserIds.length > 0) {
    const { data: rawReports } = await supabase
      .from("daily_reports")
      .select("user_id, report_date")
      .eq("workspace_id", workspaceId)
      .in("user_id", memberUserIds)
      .order("report_date", { ascending: false });

    const reports = (rawReports ?? []) as Pick<
      DailyReport,
      "user_id" | "report_date"
    >[];

    // Keep only the latest report_date per user
    for (const report of reports) {
      if (!latestReportMap[report.user_id]) {
        latestReportMap[report.user_id] = report.report_date;
      }
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
            <h2 className="text-lg font-semibold text-gray-900">
              メンバー一覧
            </h2>
            <p className="mt-1 text-sm text-gray-500">
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
                <p className="text-sm text-gray-500">
                  メンバーがいません。招待してチームを作りましょう。
                </p>
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden sm:block">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                          メンバー
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                          ロール
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                          最終日報日
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {members.map((member) => (
                        <tr key={member.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <Avatar name={member.name} size="sm" />
                              <div>
                                <p className="text-sm font-medium text-gray-900">
                                  {member.name}
                                </p>
                                <p className="text-sm text-gray-500">
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
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {member.lastReport ?? "未提出"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile list */}
                <div className="flex flex-col divide-y divide-gray-100 sm:hidden">
                  {members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center gap-3 p-4"
                    >
                      <Avatar name={member.name} size="sm" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-medium text-gray-900">
                            {member.name}
                          </p>
                          <MemberRoleSelect
                            workspaceId={workspaceId}
                            membershipId={member.id}
                            currentRole={member.role}
                            isSelf={member.userId === user.id}
                            isAdmin={isAdmin}
                          />
                        </div>
                        <p className="mt-0.5 text-xs text-gray-500">
                          最終日報: {member.lastReport ?? "未提出"}
                        </p>
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
