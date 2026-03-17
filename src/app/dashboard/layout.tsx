import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/sidebar";
import type { Profile, Workspace, UserWorkspaceMembership } from "@/lib/supabase/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateSlug(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);

  const suffix = Math.random().toString(36).slice(2, 8);
  return base ? `${base}-${suffix}` : suffix;
}

type MembershipWithWorkspace = UserWorkspaceMembership & {
  workspaces: Workspace;
};

// ---------------------------------------------------------------------------
// Layout (Server Component)
// ---------------------------------------------------------------------------

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  // -------------------------------------------------------------------------
  // 1. Get authenticated user
  // -------------------------------------------------------------------------
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // -------------------------------------------------------------------------
  // 2. Get profile (display_name, avatar_url)
  // -------------------------------------------------------------------------
  const { data: rawProfile } = await supabase
    .from("profiles")
    .select("display_name, avatar_url")
    .eq("id", user.id)
    .single();

  const profile = rawProfile as unknown as Pick<Profile, "display_name" | "avatar_url"> | null;

  const displayName =
    profile?.display_name ||
    user.user_metadata?.display_name ||
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    null;

  // -------------------------------------------------------------------------
  // 3. Get workspaces the user belongs to
  // -------------------------------------------------------------------------
  const { data: rawMemberships } = await supabase
    .from("user_workspace_memberships")
    .select("*, workspaces(*)")
    .eq("user_id", user.id);

  const memberships =
    (rawMemberships ?? []) as unknown as MembershipWithWorkspace[];

  let workspaces = memberships
    .filter((m) => m.workspaces)
    .map((m) => ({
      id: m.workspaces.id,
      name: m.workspaces.name,
    }));

  // Get the plan from the first workspace
  let workspacePlan: "free" | "starter" | "team" = memberships[0]?.workspaces?.plan ?? "free";

  // -------------------------------------------------------------------------
  // 4. Auto-create workspace if user has none (first-time login)
  // -------------------------------------------------------------------------
  if (workspaces.length === 0) {
    const workspaceName = displayName
      ? `${displayName}のワークスペース`
      : "マイワークスペース";

    const slug = generateSlug(workspaceName);

    const { data: newWorkspace, error: wsError } = await supabase
      .from("workspaces")
      .insert({
        name: workspaceName,
        slug,
        plan: "free",
      } as never)
      .select()
      .single();

    if (!wsError && newWorkspace) {
      const ws = newWorkspace as unknown as Workspace;

      // Add creator as admin
      await supabase.from("user_workspace_memberships").insert({
        user_id: user.id,
        workspace_id: ws.id,
        role: "admin",
      } as never);

      workspaces = [{ id: ws.id, name: ws.name }];
    }
  }

  // -------------------------------------------------------------------------
  // 5. Build sidebar props
  // -------------------------------------------------------------------------
  const sidebarUser = {
    displayName: displayName || "",
    email: user.email || "",
    avatarUrl: profile?.avatar_url || user.user_metadata?.avatar_url || null,
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <Sidebar user={sidebarUser} workspaces={workspaces} plan={workspacePlan} />
      <main className="lg:pl-64">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
