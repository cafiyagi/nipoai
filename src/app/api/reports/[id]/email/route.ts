import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getResendClient } from "@/lib/email/client";
import { formatReportEmailHtml } from "@/lib/email/report-email-template";
import { PLANS } from "@/lib/constants";
import { DEFAULT_TEMPLATE, type ReportTemplate } from "@/lib/report-template";
import type {
  DailyReport,
  Profile,
  Workspace,
  UserWorkspaceMembership,
  ReportDeliveryInsert,
} from "@/lib/supabase/types";

interface RouteContext {
  params: Promise<{ id: string }>;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_RECIPIENTS = 5;

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;

    // -----------------------------------------------------------------------
    // 1. Parse & validate body
    // -----------------------------------------------------------------------
    const body = await request.json().catch(() => null);
    if (!body || !Array.isArray(body.emails) || body.emails.length === 0) {
      return NextResponse.json(
        { error: "emails[] is required" },
        { status: 400 },
      );
    }

    const emails: string[] = body.emails;

    if (emails.length > MAX_RECIPIENTS) {
      return NextResponse.json(
        { error: `Maximum ${MAX_RECIPIENTS} recipients allowed` },
        { status: 400 },
      );
    }

    for (const email of emails) {
      if (typeof email !== "string" || !EMAIL_REGEX.test(email)) {
        return NextResponse.json(
          { error: `Invalid email address: ${email}` },
          { status: 400 },
        );
      }
    }

    // -----------------------------------------------------------------------
    // 2. Auth + membership check
    // -----------------------------------------------------------------------
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: rawReport, error: fetchError } = await supabase
      .from("daily_reports")
      .select("id, workspace_id, user_id, status, content, report_date")
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
      "id" | "workspace_id" | "user_id" | "status" | "content" | "report_date"
    >;

    // Verify the user is a member of the workspace
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

    // Only the report owner or admin can send emails
    if (report.user_id !== user.id && membership.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // -----------------------------------------------------------------------
    // 3. Plan check — emailDelivery must be enabled
    // -----------------------------------------------------------------------
    const admin = createAdminClient();

    const { data: rawWorkspace } = await admin
      .from("workspaces")
      .select("id, name, plan, report_template")
      .eq("id", report.workspace_id)
      .single();

    if (!rawWorkspace) {
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 404 },
      );
    }

    const workspace = rawWorkspace as unknown as Pick<
      Workspace,
      "id" | "name" | "plan" | "report_template"
    >;

    if (!PLANS[workspace.plan].limits.emailDelivery) {
      return NextResponse.json(
        { error: "メール配信はこのプランでは利用できません。プランをアップグレードしてください。" },
        { status: 403 },
      );
    }

    // -----------------------------------------------------------------------
    // 4. Fetch profile for display name
    // -----------------------------------------------------------------------
    const { data: rawProfile } = await admin
      .from("profiles")
      .select("display_name, email")
      .eq("id", report.user_id)
      .single();

    const profile = rawProfile as Pick<Profile, "display_name" | "email"> | null;
    const userName = profile?.display_name ?? profile?.email ?? "メンバー";

    // -----------------------------------------------------------------------
    // 5. Build email HTML
    // -----------------------------------------------------------------------
    const template: ReportTemplate =
      workspace.report_template ?? DEFAULT_TEMPLATE;

    const html = formatReportEmailHtml({
      content: report.content,
      template,
      userName,
      reportDate: report.report_date,
      workspaceName: workspace.name,
    });

    const subject = `${userName}さんの日報 (${report.report_date})`;

    // -----------------------------------------------------------------------
    // 6. Send via Resend
    // -----------------------------------------------------------------------
    const resend = getResendClient();
    if (!resend) {
      return NextResponse.json(
        { error: "Email service is not configured" },
        { status: 503 },
      );
    }

    const { error: sendError } = await resend.emails.send({
      from: "NipoAI <noreply@nipoai.app>",
      to: emails,
      subject,
      html,
    });

    if (sendError) {
      console.error("Resend email error:", sendError);
      return NextResponse.json(
        { error: "メール送信に失敗しました" },
        { status: 502 },
      );
    }

    // -----------------------------------------------------------------------
    // 7. Record deliveries
    // -----------------------------------------------------------------------
    const now = new Date().toISOString();
    const deliveries: ReportDeliveryInsert[] = emails.map((email) => ({
      report_id: report.id,
      channel: "email" as const,
      recipient: email,
      status: "sent" as const,
      sent_at: now,
    }));

    await admin
      .from("report_deliveries")
      .insert(deliveries as never[]);

    return NextResponse.json({
      message: "メールを送信しました",
      sent_to: emails,
    });
  } catch (error) {
    console.error("POST /api/reports/[id]/email error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
