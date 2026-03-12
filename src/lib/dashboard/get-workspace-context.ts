import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { UserWorkspaceMembership, Workspace } from "@/lib/supabase/types";

type MembershipWithWorkspace = Pick<UserWorkspaceMembership, "workspace_id" | "role"> & {
  workspaces: Workspace;
};

export async function getWorkspaceContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Single query: membership + workspace join
  const { data: rawMembership } = await supabase
    .from("user_workspace_memberships")
    .select("workspace_id, role, workspaces(*)")
    .eq("user_id", user.id)
    .limit(1)
    .single();

  if (!rawMembership) redirect("/onboarding");

  const membership = rawMembership as unknown as MembershipWithWorkspace;

  if (!membership.workspaces) redirect("/onboarding");

  return {
    user,
    supabase,
    workspace: membership.workspaces,
    workspaceId: membership.workspace_id,
    isAdmin: membership.role === "admin",
  };
}
