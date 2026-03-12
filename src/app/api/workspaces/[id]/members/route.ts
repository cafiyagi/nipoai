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
        "id, role, created_at, profiles!user_workspace_memberships_user_id_profiles_fkey(id, email, display_name, avatar_url)",
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
    const admin = createAdminClient();

    const { data: rawWorkspace } = await admin
      .from("workspaces")
      .select("plan, name")
      .eq("id", workspaceId)
      .single();

    const workspace = rawWorkspace as Pick<Workspace, "plan" | "name"> | null;

    if (!workspace) {
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 404 },
      );
    }

    const { count: memberCount } = await admin
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
          error: `メンバー数が上限（${maxMembers}人）に達しています。プランをアップグレードしてください。`,
        },
        { status: 403 },
      );
    }

    // Find the user by email
    const { data: rawTargetProfile } = await admin
      .from("profiles")
      .select("id")
      .eq("email", email.toLowerCase())
      .single();

    const targetProfile = rawTargetProfile as Pick<Profile, "id"> | null;

    if (targetProfile) {
      // ---- User exists: add directly ----

      // Check if already a member
      const { data: rawExisting } = await admin
        .from("user_workspace_memberships")
        .select("id")
        .eq("user_id", targetProfile.id)
        .eq("workspace_id", workspaceId)
        .single();

      if (rawExisting) {
        return NextResponse.json(
          { error: "このユーザーは既にメンバーです" },
          { status: 409 },
        );
      }

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
          { error: "メンバーの追加に失敗しました" },
          { status: 500 },
        );
      }

      return NextResponse.json({ membership: newMembership }, { status: 201 });
    }

    // ---- User does not exist: create invitation ----

    // Check for existing pending invitation
    const { data: existingInvite } = await admin
      .from("workspace_invitations")
      .select("id, status")
      .eq("workspace_id", workspaceId)
      .eq("email", email.toLowerCase())
      .single();

    if (existingInvite) {
      if ((existingInvite as { status: string }).status === "pending") {
        return NextResponse.json(
          { error: "このメールアドレスには既に招待を送信済みです" },
          { status: 409 },
        );
      }
      // Expired invitation — delete and re-create
      await admin
        .from("workspace_invitations")
        .delete()
        .eq("id", (existingInvite as { id: string }).id);
    }

    // Create invitation record
    const { error: inviteError } = await admin
      .from("workspace_invitations")
      .insert({
        workspace_id: workspaceId,
        email: email.toLowerCase(),
        role,
        invited_by: user.id,
      } as never);

    if (inviteError) {
      console.error("Failed to create invitation:", inviteError);
      return NextResponse.json(
        { error: "招待の作成に失敗しました" },
        { status: 500 },
      );
    }

    // Send invite email via Supabase Auth (uses Supabase's email infra)
    const { error: inviteAuthError } = await admin.auth.admin.inviteUserByEmail(
      email.toLowerCase(),
      {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/callback`,
      },
    );

    if (inviteAuthError) {
      console.error("Failed to send invite email:", inviteAuthError);
      // Don't fail — invitation record is saved, user can still sign up manually
    }

    return NextResponse.json(
      { message: "招待メールを送信しました", invited: true },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST /api/workspaces/[id]/members error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
