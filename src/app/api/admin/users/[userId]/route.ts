import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSuperAdmin } from "@/lib/auth/admin";

/** Max delete operations allowed within the rate-limit window. */
const BULK_DELETE_LIMIT = 3;
/** Rate-limit window in minutes. */
const RATE_LIMIT_WINDOW_MINUTES = 5;
/** Confirmation token validity in minutes. */
const TOKEN_EXPIRY_MINUTES = 5;

interface RouteContext {
  params: Promise<{ userId: string }>;
}

export async function DELETE(request: Request, context: RouteContext) {
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
    if (!isSuperAdmin(user.email)) {
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

    // Parse request body for confirmToken
    let confirmToken: string | undefined;
    try {
      const body = await request.json();
      confirmToken = body.confirmToken;
    } catch {
      // No body or invalid JSON — treat as first step
    }

    // --- Bulk-delete rate limit ---
    const windowStart = new Date(
      Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000,
    ).toISOString();

    const { count: recentDeletes } = await admin
      .from("admin_audit_logs")
      .select("*", { count: "exact", head: true })
      .eq("action", "user_delete")
      .eq("admin_user_id", user.id)
      .gte("created_at", windowStart);

    if ((recentDeletes ?? 0) >= BULK_DELETE_LIMIT) {
      return NextResponse.json(
        {
          error: `短時間に${BULK_DELETE_LIMIT}件以上の削除はできません。しばらく待ってから再試行してください。`,
        },
        { status: 429 },
      );
    }

    // --- Step 1: Issue confirmation token ---
    if (!confirmToken) {
      const token = crypto.randomUUID();

      await admin.from("admin_audit_logs").insert({
        admin_user_id: user.id,
        admin_email: user.email,
        target_type: "user",
        target_id: userId,
        action: "delete_confirm_request",
        metadata: { token },
      } as never);

      return NextResponse.json({
        requireConfirmation: true,
        confirmToken: token,
      });
    }

    // --- Step 2: Verify token and delete ---
    const tokenWindowStart = new Date(
      Date.now() - TOKEN_EXPIRY_MINUTES * 60 * 1000,
    ).toISOString();

    const { data: confirmRecords } = await admin
      .from("admin_audit_logs")
      .select("metadata")
      .eq("action", "delete_confirm_request")
      .eq("admin_user_id", user.id)
      .eq("target_user_id", userId)
      .gte("created_at", tokenWindowStart)
      .order("created_at", { ascending: false })
      .limit(10);

    const tokenValid = confirmRecords?.some(
      (record: { metadata: { token?: string } | null }) =>
        record.metadata?.token === confirmToken,
    );

    if (!tokenValid) {
      return NextResponse.json(
        { error: "確認トークンが無効または期限切れです。もう一度やり直してください。" },
        { status: 400 },
      );
    }

    // Execute deletion
    const { error: deleteError } = await admin.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error("Failed to delete user:", deleteError);
      return NextResponse.json(
        { error: "ユーザーの削除に失敗しました" },
        { status: 500 },
      );
    }

    // Record successful deletion in audit log
    await admin.from("admin_audit_logs").insert({
      admin_user_id: user.id,
      admin_email: user.email,
      action: "user_delete",
      target_type: "user",
      target_id: userId,
      metadata: {
        confirmed_with_token: confirmToken,
        user_agent: request.headers.get("user-agent"),
      },
    } as never);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/admin/users/[userId] error:", error);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 },
    );
  }
}
