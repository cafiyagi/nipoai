import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type {
  ReportContent,
  DailyReport,
  DailyReportUpdate,
  UserWorkspaceMembership,
} from "@/lib/supabase/types";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch the report with related data
    const { data: rawReport, error } = await supabase
      .from("daily_reports")
      .select(
        "*, profiles(display_name, email), workspaces(name, slug)",
      )
      .eq("id", id)
      .single();

    if (error || !rawReport) {
      return NextResponse.json(
        { error: "Report not found" },
        { status: 404 },
      );
    }

    const report = rawReport as unknown as DailyReport & {
      profiles: { display_name: string | null; email: string };
      workspaces: { name: string; slug: string };
    };

    // Authorization: check workspace membership
    const { data: rawMembership } = await supabase
      .from("user_workspace_memberships")
      .select("role")
      .eq("user_id", user.id)
      .eq("workspace_id", report.workspace_id)
      .single();

    const membership = rawMembership as Pick<
      UserWorkspaceMembership,
      "role"
    > | null;

    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Non-admin members can only see their own reports
    if (membership.role !== "admin" && report.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ report });
  } catch (error) {
    console.error("GET /api/reports/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { content, status } = body as {
      content?: ReportContent;
      status?: string;
    };

    // Fetch the existing report
    const { data: rawReport, error: fetchError } = await supabase
      .from("daily_reports")
      .select("id, workspace_id, user_id, status")
      .eq("id", id)
      .single();

    if (fetchError || !rawReport) {
      return NextResponse.json(
        { error: "Report not found" },
        { status: 404 },
      );
    }

    const report = rawReport as unknown as Pick<
      DailyReport,
      "id" | "workspace_id" | "user_id" | "status"
    >;

    // Authorization: check membership
    const { data: rawMembership } = await supabase
      .from("user_workspace_memberships")
      .select("role")
      .eq("user_id", user.id)
      .eq("workspace_id", report.workspace_id)
      .single();

    const membership = rawMembership as Pick<
      UserWorkspaceMembership,
      "role"
    > | null;

    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Only the report owner or admin can edit
    if (membership.role !== "admin" && report.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Only draft reports can be edited (admins can also edit submitted)
    const editableStatuses =
      membership.role === "admin"
        ? ["draft", "submitted"]
        : ["draft"];

    if (!editableStatuses.includes(report.status)) {
      return NextResponse.json(
        { error: "Report cannot be edited in its current status" },
        { status: 409 },
      );
    }

    // Build update payload
    const updateData: DailyReportUpdate = {};
    if (content !== undefined) updateData.content = content;
    if (status !== undefined) {
      const allowedStatuses = ["draft", "submitted"];
      if (!allowedStatuses.includes(status)) {
        return NextResponse.json(
          { error: `Invalid status: ${status}` },
          { status: 400 },
        );
      }
      updateData.status = status as DailyReport["status"];
      if (status === "submitted") {
        updateData.submitted_at = new Date().toISOString();
      }
    }

    if (!updateData.content && !updateData.status) {
      return NextResponse.json(
        { error: "No update fields provided" },
        { status: 400 },
      );
    }

    const { data: updated, error: updateError } = await supabase
      .from("daily_reports")
      .update(updateData as never)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("Failed to update report:", updateError);
      return NextResponse.json(
        { error: "Failed to update report" },
        { status: 500 },
      );
    }

    return NextResponse.json({ report: updated });
  } catch (error) {
    console.error("PATCH /api/reports/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch the report
    const { data: rawReport, error: fetchError } = await supabase
      .from("daily_reports")
      .select("id, workspace_id, user_id, status")
      .eq("id", id)
      .single();

    if (fetchError || !rawReport) {
      return NextResponse.json(
        { error: "日報が見つかりません" },
        { status: 404 },
      );
    }

    const report = rawReport as unknown as Pick<
      DailyReport,
      "id" | "workspace_id" | "user_id" | "status"
    >;

    // Authorization: check membership
    const { data: rawMembership } = await supabase
      .from("user_workspace_memberships")
      .select("role")
      .eq("user_id", user.id)
      .eq("workspace_id", report.workspace_id)
      .single();

    const membership = rawMembership as Pick<
      UserWorkspaceMembership,
      "role"
    > | null;

    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Only the report owner or admin can delete
    if (membership.role !== "admin" && report.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Only draft/generating reports can be deleted
    if (report.status !== "draft" && report.status !== "generating") {
      return NextResponse.json(
        { error: "提出済みの日報は削除できません" },
        { status: 409 },
      );
    }

    const { error: deleteError } = await supabase
      .from("daily_reports")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error("Failed to delete report:", deleteError);
      return NextResponse.json(
        { error: "日報の削除に失敗しました" },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/reports/[id] error:", error);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 },
    );
  }
}
