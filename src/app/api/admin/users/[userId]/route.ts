import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const SUPER_ADMIN_EMAILS = ["cafiyagi@gmail.com"];

interface RouteContext {
  params: Promise<{ userId: string }>;
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { userId } = await context.params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Super Admin check
    if (!SUPER_ADMIN_EMAILS.includes(user.email ?? "")) {
      return NextResponse.json(
        { error: "Super Admin権限が必要です" },
        { status: 403 },
      );
    }

    // Prevent deleting yourself
    if (userId === user.id) {
      return NextResponse.json(
        { error: "自分自身は削除できません" },
        { status: 400 },
      );
    }

    const admin = createAdminClient();

    const { error: deleteError } = await admin.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error("Failed to delete user:", deleteError);
      return NextResponse.json(
        { error: "ユーザーの削除に失敗しました" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/admin/users/[userId] error:", error);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 },
    );
  }
}
