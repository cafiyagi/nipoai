import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_TEMPLATE } from "@/lib/report-template";
import { PLANS } from "@/lib/constants";
import { ReportPdfDocument } from "@/lib/pdf/report-pdf-template";
import type {
  DailyReport,
  UserWorkspaceMembership,
  Profile,
  Workspace,
} from "@/lib/supabase/types";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();

    // 1. Auth check
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Fetch report
    const { data: rawReport, error: fetchError } = await supabase
      .from("daily_reports")
      .select("id, workspace_id, user_id, report_date, content, status")
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
      "id" | "workspace_id" | "user_id" | "report_date" | "content" | "status"
    >;

    // 3. Authorization: workspace membership check
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

    // Non-admin members can only download their own reports
    if (membership.role !== "admin" && report.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 4. Fetch profile (report owner)
    const { data: rawProfile } = await supabase
      .from("profiles")
      .select("display_name, email")
      .eq("id", report.user_id)
      .single();

    const profile = rawProfile as Pick<
      Profile,
      "display_name" | "email"
    > | null;

    const userName =
      profile?.display_name ?? profile?.email ?? "メンバー";

    // 5. Fetch workspace
    const { data: rawWorkspace } = await supabase
      .from("workspaces")
      .select("name, plan, report_template")
      .eq("id", report.workspace_id)
      .single();

    const workspace = rawWorkspace as Pick<
      Workspace,
      "name" | "plan" | "report_template"
    > | null;

    if (!workspace) {
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 404 },
      );
    }

    const template = workspace.report_template ?? DEFAULT_TEMPLATE;

    // 6. Plan-based watermark flag
    const showWatermark = PLANS[workspace.plan].limits.watermark;

    // 7. Render PDF
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const element = React.createElement(ReportPdfDocument, {
      content: report.content,
      template,
      userName,
      reportDate: report.report_date,
      workspaceName: workspace.name,
      showWatermark,
    }) as any;

    const buffer = await renderToBuffer(element);

    // 8. Return PDF response
    const fileName = `${userName}の日報_${report.report_date}.pdf`;
    const encodedFileName = encodeURIComponent(fileName);

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${encodedFileName}"; filename*=UTF-8''${encodedFileName}`,
        "Cache-Control": "private, no-cache",
      },
    });
  } catch (error) {
    console.error("GET /api/reports/[id]/pdf error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
