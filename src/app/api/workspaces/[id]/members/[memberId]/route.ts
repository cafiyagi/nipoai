import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { UserWorkspaceMembership } from "@/lib/supabase/types";

interface RouteContext {
  params: Promise<{ id: string; memberId: string }>;
}

// Update member role
export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id: workspaceId, memberId } = await context.params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can change roles
    const { data: rawMembership } = await supabase
      .from("user_workspace_memberships")
      .select("role")
      .eq("user_id", user.id)
      .eq("workspace_id", workspaceId)
      .single();

    const membership = rawMembership as Pick<UserWorkspaceMembership, "role"> | null;

    if (!membership || membership.role !== "admin") {
      return NextResponse.json(
        { error: "管理者のみロールを変更できます" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { role } = body as { role?: string };

    if (role !== "admin" && role !== "member") {
      return NextResponse.json(
        { error: "ロールは 'admin' または 'member' である必要があります" },
        { status: 400 },
      );
    }

    const admin = createAdminClient();

    const { error: updateError } = await admin
      .from("user_workspace_memberships")
      .update({ role } as never)
      .eq("id", memberId)
      .eq("workspace_id", workspaceId);

    if (updateError) {
      console.error("Failed to update member role:", updateError);
      return NextResponse.json(
        { error: "ロールの更新に失敗しました" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PATCH /api/workspaces/[id]/members/[memberId] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Remove member
export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id: workspaceId, memberId } = await context.params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can remove members
    const { data: rawMembership } = await supabase
      .from("user_workspace_memberships")
      .select("role")
      .eq("user_id", user.id)
      .eq("workspace_id", workspaceId)
      .single();

    const membership = rawMembership as Pick<UserWorkspaceMembership, "role"> | null;

    if (!membership || membership.role !== "admin") {
      return NextResponse.json(
        { error: "管理者のみメンバーを削除できます" },
        { status: 403 },
      );
    }

    // Prevent removing yourself
    const admin = createAdminClient();

    const { data: rawTarget } = await admin
      .from("user_workspace_memberships")
      .select("user_id")
      .eq("id", memberId)
      .single();

    if ((rawTarget as { user_id: string } | null)?.user_id === user.id) {
      return NextResponse.json(
        { error: "自分自身は削除できません" },
        { status: 400 },
      );
    }

    const { error: deleteError } = await admin
      .from("user_workspace_memberships")
      .delete()
      .eq("id", memberId)
      .eq("workspace_id", workspaceId);

    if (deleteError) {
      console.error("Failed to remove member:", deleteError);
      return NextResponse.json(
        { error: "メンバーの削除に失敗しました" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/workspaces/[id]/members/[memberId] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
