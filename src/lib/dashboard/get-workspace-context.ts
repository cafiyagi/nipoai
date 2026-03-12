import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { UserWorkspaceMembership, Workspace } from "@/lib/supabase/types";

export async function getWorkspaceContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: rawMembership } = await supabase
    .from("user_workspace_memberships")
    .select("workspace_id, role")
    .eq("user_id", user.id)
    .limit(1)
    .single();

  if (!rawMembership) redirect("/onboarding");

  const membership = rawMembership as Pick<
    UserWorkspaceMembership,
    "workspace_id" | "role"
  >;

  const { data: rawWorkspace } = await supabase
    .from("workspaces")
    .select("*")
    .eq("id", membership.workspace_id)
    .single();

  if (!rawWorkspace) redirect("/onboarding");

  return {
    user,
    supabase,
    workspace: rawWorkspace as Workspace,
    workspaceId: membership.workspace_id,
    isAdmin: membership.role === "admin",
  };
}
