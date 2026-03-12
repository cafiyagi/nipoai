import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  UserWorkspaceMembership,
  UserWorkspaceMembershipInsert,
  Profile,
  Workspace,
} from "@/lib/supabase/types";

interface RouteContext {
  params: Promise<{ id: string }>;
}

type MemberWithProfile = UserWorkspaceMembership & {
  profiles: Pick<Profile, "id" | "email" | "display_name" | "avatar_url">;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id: workspaceId } = await context.params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify the user is a member of this workspace
    const { data: rawMembership } = await supabase
      .from("user_workspace_memberships")
      .select("role")
      .eq("user_id", user.id)
      .eq("workspace_id", workspaceId)
      .single();

    if (!rawMembership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get all members with their profiles
    const { data: rawMembers, error } = await supabase
      .from("user_workspace_memberships")
      .select(
        "id, role, created_at, profiles(id, email, display_name, avatar_url)",
      )
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Failed to fetch members:", error);
      return NextResponse.json(
        { error: "Failed to fetch members" },
        { status: 500 },
      );
    }

    const members = (rawMembers ?? []) as unknown as MemberWithProfile[];

    const formattedMembers = members.map((m) => ({
      id: m.id,
      userId: m.profiles?.id,
      email: m.profiles?.email,
      displayName: m.profiles?.display_name,
      avatarUrl: m.profiles?.avatar_url,
      role: m.role,
      joinedAt: m.created_at,
    }));

    return NextResponse.json({ members: formattedMembers });
  } catch (error) {
    console.error("GET /api/workspaces/[id]/members error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id: workspaceId } = await context.params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can invite members
    const { data: rawMembership } = await supabase
      .from("user_workspace_memberships")
      .select("role")
      .eq("user_id", user.id)
      .eq("workspace_id", workspaceId)
      .single();

    const membership = rawMembership as Pick<
      UserWorkspaceMembership,
      "role"
    > | null;

    if (!membership || membership.role !== "admin") {
      return NextResponse.json(
        { error: "Only workspace admins can invite members" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { email, role = "member" } = body as {
      email?: string;
      role?: string;
    };

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 },
      );
    }

    if (role !== "admin" && role !== "member") {
      return NextResponse.json(
        { error: "Role must be 'admin' or 'member'" },
        { status: 400 },
      );
    }

    // Check workspace plan limits
    const { data: rawWorkspace } = await supabase
      .from("workspaces")
      .select("plan")
      .eq("id", workspaceId)
      .single();

    const workspace = rawWorkspace as Pick<Workspace, "plan"> | null;

    if (!workspace) {
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 404 },
      );
    }

    const { count: memberCount } = await supabase
      .from("user_workspace_memberships")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId);

    const planLimits: Record<string, number> = {
      free: 3,
      starter: 10,
      team: Infinity,
    };

    const maxMembers = planLimits[workspace.plan] ?? 3;
    if ((memberCount ?? 0) >= maxMembers) {
      return NextResponse.json(
        {
          error: `Workspace has reached the maximum number of members (${maxMembers}) for the ${workspace.plan} plan`,
        },
        { status: 403 },
      );
    }

    // Find the user by email using admin client
    const admin = createAdminClient();
    const { data: rawTargetProfile } = await admin
      .from("profiles")
      .select("id")
      .eq("email", email.toLowerCase())
      .single();

    const targetProfile = rawTargetProfile as Pick<Profile, "id"> | null;

    if (!targetProfile) {
      return NextResponse.json(
        {
          error:
            "User not found. They need to sign up first before being invited.",
        },
        { status: 404 },
      );
    }

    // Check if already a member
    const { data: rawExisting } = await admin
      .from("user_workspace_memberships")
      .select("id")
      .eq("user_id", targetProfile.id)
      .eq("workspace_id", workspaceId)
      .single();

    if (rawExisting) {
      return NextResponse.json(
        { error: "User is already a member of this workspace" },
        { status: 409 },
      );
    }

    // Add the member
    const memberRow: UserWorkspaceMembershipInsert = {
      user_id: targetProfile.id,
      workspace_id: workspaceId,
      role: role as "admin" | "member",
    };

    const { data: newMembership, error: insertError } = await admin
      .from("user_workspace_memberships")
      .insert(memberRow as never)
      .select()
      .single();

    if (insertError) {
      console.error("Failed to add member:", insertError);
      return NextResponse.json(
        { error: "Failed to add member" },
        { status: 500 },
      );
    }

    return NextResponse.json({ membership: newMembership }, { status: 201 });
  } catch (error) {
    console.error("POST /api/workspaces/[id]/members error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
