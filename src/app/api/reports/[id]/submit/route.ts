import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type {
  DailyReport,
  DailyReportUpdate,
  UserWorkspaceMembership,
} from "@/lib/supabase/types";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(_request: Request, context: RouteContext) {
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
        { error: "Report not found" },
        { status: 404 },
      );
    }

    const report = rawReport as unknown as Pick<
      DailyReport,
      "id" | "workspace_id" | "user_id" | "status"
    >;

    // Only the report owner can submit (or workspace admin)
    if (report.user_id !== user.id) {
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

      if (!membership || membership.role !== "admin") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // Only draft reports can be submitted
    if (report.status !== "draft") {
      return NextResponse.json(
        {
          error: `Report cannot be submitted from status '${report.status}'. Only draft reports can be submitted.`,
        },
        { status: 409 },
      );
    }

    const now = new Date().toISOString();
    const updateData: DailyReportUpdate = {
      status: "submitted",
      submitted_at: now,
    };

    const { data: updated, error: updateError } = await supabase
      .from("daily_reports")
      .update(updateData as never)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("Failed to submit report:", updateError);
      return NextResponse.json(
        { error: "Failed to submit report" },
        { status: 500 },
      );
    }

    return NextResponse.json({ report: updated });
  } catch (error) {
    console.error("POST /api/reports/[id]/submit error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
