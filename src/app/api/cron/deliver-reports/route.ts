import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createSlackClient } from "@/lib/slack/client";
import { DEFAULT_TEMPLATE, type ReportTemplate } from "@/lib/report-template";
import type {
  ReportContent,
  DailyReport,
  Profile,
  Workspace,
  SlackIntegration,
  ReportDelivery,
  ReportDeliveryInsert,
  ReportDeliveryUpdate,
  DailyReportUpdate,
} from "@/lib/supabase/types";

export const maxDuration = 300; // 5 minutes for Vercel

const MAX_DELIVERY_RETRIES = 3;

type ReportWithRelations = DailyReport & {
  workspaces: Pick<Workspace, "id" | "name" | "timezone" | "report_template"> & {
    slack_integrations: Pick<SlackIntegration, "id" | "encrypted_bot_token">[];
  };
  profiles: Pick<Profile, "display_name" | "email">;
};

/** Map of known section keys to Slack emoji icons. Falls back to a bullet. */
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

export async function POST(request: Request) {
  try {
    // Authenticate cron request
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();

    // Get submitted reports that need delivery
    const { data: rawReports, error: reportsError } = await admin
      .from("daily_reports")
      .select(
        "id, workspace_id, user_id, report_date, content, workspaces(id, name, timezone, report_template, slack_integrations(id, encrypted_bot_token)), profiles(display_name, email)",
      )
      .eq("status", "submitted");

    if (reportsError) {
      console.error("Failed to fetch submitted reports:", reportsError);
      return NextResponse.json(
        { error: "Failed to fetch reports" },
        { status: 500 },
      );
    }

    const reports = (rawReports ?? []) as unknown as ReportWithRelations[];

    const results = {
      delivered: 0,
      failed: 0,
      skipped: 0,
      errors: [] as string[],
    };

    for (const report of reports) {
      try {
        const workspace = report.workspaces;
        const profile = report.profiles;

        if (!workspace?.slack_integrations?.length) {
          results.skipped++;
          continue;
        }

        const integration = workspace.slack_integrations[0];
        const slackClient = createSlackClient(integration.encrypted_bot_token);
        const userName = profile?.display_name ?? profile?.email ?? "メンバー";

        const formattedMessage = formatReportForSlack(
          report.content,
          userName,
          report.report_date,
          workspace.report_template ?? DEFAULT_TEMPLATE,
        );

        // Check for existing pending/failed deliveries
        const { data: rawDeliveries } = await admin
          .from("report_deliveries")
          .select("id, status, retry_count")
          .eq("report_id", report.id)
          .eq("channel", "slack_dm");

        const deliveries = (rawDeliveries ?? []) as Pick<
          ReportDelivery,
          "id" | "status" | "retry_count"
        >[];
        const existingDelivery = deliveries[0];

        // Skip if already sent
        if (existingDelivery?.status === "sent") {
          results.skipped++;
          continue;
        }

        // Skip if max retries exceeded
        if (
          existingDelivery &&
          existingDelivery.retry_count >= MAX_DELIVERY_RETRIES
        ) {
          results.skipped++;
          continue;
        }

        // Look up the Slack user ID for the report owner by email
        let slackUserId: string | undefined;
        try {
          const lookupResult = await slackClient.users.lookupByEmail({
            email: profile?.email ?? "",
          });
          slackUserId = lookupResult.user?.id;
        } catch {
          results.skipped++;
          continue;
        }

        if (!slackUserId) {
          results.skipped++;
          continue;
        }

        // Open a DM channel
        let dmChannelId: string | undefined;
        try {
          const dmResult = await slackClient.conversations.open({
            users: slackUserId,
          });
          dmChannelId = dmResult.channel?.id;
        } catch (dmError) {
          console.error(
            `Failed to open DM with ${slackUserId}:`,
            dmError,
          );
        }

        if (!dmChannelId) {
          if (existingDelivery) {
            const updatePayload: ReportDeliveryUpdate = {
              status: "failed",
              error_message: "Could not open DM channel",
              retry_count: existingDelivery.retry_count + 1,
            };
            await admin
              .from("report_deliveries")
              .update(updatePayload as never)
              .eq("id", existingDelivery.id);
          } else {
            const insertPayload: ReportDeliveryInsert = {
              report_id: report.id,
              channel: "slack_dm",
              recipient: slackUserId,
              status: "failed",
              error_message: "Could not open DM channel",
              retry_count: 1,
            };
            await admin
              .from("report_deliveries")
              .insert(insertPayload as never);
          }
          results.failed++;
          continue;
        }

        // Send the message
        try {
          await slackClient.chat.postMessage({
            channel: dmChannelId,
            text: formattedMessage,
            mrkdwn: true,
          });

          if (existingDelivery) {
            const updatePayload: ReportDeliveryUpdate = {
              status: "sent",
              sent_at: new Date().toISOString(),
              error_message: null,
            };
            await admin
              .from("report_deliveries")
              .update(updatePayload as never)
              .eq("id", existingDelivery.id);
          } else {
            const insertPayload: ReportDeliveryInsert = {
              report_id: report.id,
              channel: "slack_dm",
              recipient: slackUserId,
              status: "sent",
              sent_at: new Date().toISOString(),
            };
            await admin
              .from("report_deliveries")
              .insert(insertPayload as never);
          }

          // Update report status to delivered
          const reportUpdate: DailyReportUpdate = { status: "delivered" };
          await admin
            .from("daily_reports")
            .update(reportUpdate as never)
            .eq("id", report.id);

          results.delivered++;
        } catch (sendError) {
          const errorMessage =
            sendError instanceof Error
              ? sendError.message
              : String(sendError);

          if (existingDelivery) {
            const updatePayload: ReportDeliveryUpdate = {
              status: "failed",
              error_message: errorMessage,
              retry_count: existingDelivery.retry_count + 1,
            };
            await admin
              .from("report_deliveries")
              .update(updatePayload as never)
              .eq("id", existingDelivery.id);
          } else {
            const insertPayload: ReportDeliveryInsert = {
              report_id: report.id,
              channel: "slack_dm",
              recipient: slackUserId,
              status: "failed",
              error_message: errorMessage,
              retry_count: 1,
            };
            await admin
              .from("report_deliveries")
              .insert(insertPayload as never);
          }

          results.failed++;
          results.errors.push(`Report ${report.id}: ${errorMessage}`);
        }
      } catch (reportError) {
        results.failed++;
        results.errors.push(
          `Report ${report.id}: ${
            reportError instanceof Error
              ? reportError.message
              : String(reportError)
          }`,
        );
      }
    }

    return NextResponse.json({
      ok: true,
      totalReports: reports.length,
      ...results,
    });
  } catch (error) {
    console.error("Cron deliver-reports fatal error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
