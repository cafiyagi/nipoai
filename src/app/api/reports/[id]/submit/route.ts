import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createSlackClient } from "@/lib/slack/client";
import { DEFAULT_TEMPLATE, type ReportTemplate } from "@/lib/report-template";
import type {
  DailyReport,
  DailyReportUpdate,
  ReportContent,
  UserWorkspaceMembership,
  SlackIntegration,
  Workspace,
  Profile,
  ReportDeliveryInsert,
} from "@/lib/supabase/types";

interface RouteContext {
  params: Promise<{ id: string }>;
}

const SECTION_ICONS: Record<string, string> = {
  achievements: ":white_check_mark:",
  challenges: ":warning:",
  tomorrow_plan: ":calendar:",
  remarks: ":memo:",
};

function formatReportForSlack(
  content: ReportContent,
  userName: string,
  reportDate: string,
  template: ReportTemplate,
): string {
  const lines: string[] = [];
  lines.push(`*${userName}さんの日報 (${reportDate})*\n`);

  for (const section of template) {
    const items = content[section.key] ?? [];
    if (items.length === 0) continue;

    const icon = SECTION_ICONS[section.key] ?? ":small_blue_diamond:";
    lines.push(`*${icon} ${section.label}*`);
    for (const item of items) {
      lines.push(`  - ${item}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Deliver submitted report to Slack (fire-and-forget, non-blocking).
 * Failures are logged but do not affect the submit response.
 */
async function deliverToSlack(reportId: string, workspaceId: string, channelId?: string) {
  try {
    const admin = createAdminClient();

    const { data: rawWorkspace } = await admin
      .from("workspaces")
      .select(
        "id, name, timezone, report_template, slack_integrations(id, encrypted_bot_token)",
      )
      .eq("id", workspaceId)
      .single();

    if (!rawWorkspace) return;

    const workspace = rawWorkspace as unknown as Pick<
      Workspace,
      "id" | "name" | "timezone" | "report_template"
    > & {
      slack_integrations: Pick<SlackIntegration, "id" | "encrypted_bot_token">[];
    };

    if (!workspace.slack_integrations?.length) return;

    const { data: rawReport } = await admin
      .from("daily_reports")
      .select("id, content, report_date, user_id, profiles(display_name, email)")
      .eq("id", reportId)
      .single();

    if (!rawReport) return;

    const report = rawReport as unknown as Pick<
      DailyReport,
      "id" | "content" | "report_date" | "user_id"
    > & {
      profiles: Pick<Profile, "display_name" | "email">;
    };

    const integration = workspace.slack_integrations[0];
    const slackClient = createSlackClient(integration.encrypted_bot_token);
    const userName =
      report.profiles?.display_name ?? report.profiles?.email ?? "メンバー";
    const template = workspace.report_template ?? DEFAULT_TEMPLATE;

    const formattedMessage = formatReportForSlack(
      report.content,
      userName,
      report.report_date,
      template,
    );

    if (channelId) {
      // Channel delivery: post to the specified Slack channel
      try {
        await slackClient.conversations.join({ channel: channelId });
      } catch {
        // Already in channel or cannot join — continue anyway
      }

      await slackClient.chat.postMessage({
        channel: channelId,
        text: formattedMessage,
        mrkdwn: true,
      });

      // Record delivery
      const deliveryPayload: ReportDeliveryInsert = {
        report_id: reportId,
        channel: "slack_channel",
        recipient: channelId,
        status: "sent",
        sent_at: new Date().toISOString(),
      };
      await admin.from("report_deliveries").insert(deliveryPayload as never);
    } else {
      // DM delivery: look up Slack user by email and send DM
      let slackUserId: string | undefined;
      try {
        const lookupResult = await slackClient.users.lookupByEmail({
          email: report.profiles?.email ?? "",
        });
        slackUserId = lookupResult.user?.id;
      } catch {
        return; // User not found in Slack
      }

      if (!slackUserId) return;

      const dmResult = await slackClient.conversations.open({
        users: slackUserId,
      });
      const dmChannelId = dmResult.channel?.id;
      if (!dmChannelId) return;

      await slackClient.chat.postMessage({
        channel: dmChannelId,
        text: formattedMessage,
        mrkdwn: true,
      });

      // Record delivery
      const deliveryPayload: ReportDeliveryInsert = {
        report_id: reportId,
        channel: "slack_dm",
        recipient: slackUserId,
        status: "sent",
        sent_at: new Date().toISOString(),
      };
      await admin.from("report_deliveries").insert(deliveryPayload as never);
    }

    // Update report status to delivered
    const deliveredUpdate: DailyReportUpdate = { status: "delivered" };
    await admin
      .from("daily_reports")
      .update(deliveredUpdate as never)
      .eq("id", reportId);
  } catch (error) {
    console.error("Slack delivery failed (non-blocking):", error);
  }
}

export async function POST(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await _request.json().catch(() => ({}));
    const { channel_id } = body as { channel_id?: string };
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

    // Deliver to Slack in the background (non-blocking)
    deliverToSlack(report.id, report.workspace_id, channel_id).catch(() => {});

    return NextResponse.json({ report: updated });
  } catch (error) {
    console.error("POST /api/reports/[id]/submit error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
