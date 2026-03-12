import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createSlackClient } from "@/lib/slack/client";
import { fetchChannelMessages } from "@/lib/slack/messages";
import { preprocessMessages } from "@/lib/slack/preprocessing";
import { generateDailyReport } from "@/lib/ai/generate-report";
import { DEFAULT_TEMPLATE } from "@/lib/report-template";
import type {
  Workspace,
  SlackIntegration,
  UserWorkspaceMembership,
  DailyReportInsert,
} from "@/lib/supabase/types";

export const maxDuration = 300; // 5 minutes for Vercel
// HMR refresh trigger

function getTimeInTimezone(
  date: Date,
  timezone: string,
): { hours: number; minutes: number; dateStr: string } {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const hours = parseInt(
    parts.find((p) => p.type === "hour")?.value ?? "0",
    10,
  );
  const minutes = parseInt(
    parts.find((p) => p.type === "minute")?.value ?? "0",
    10,
  );

  // sv-SE locale produces YYYY-MM-DD format
  const dateFormatter = new Intl.DateTimeFormat("sv-SE", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const dateStr = dateFormatter.format(date);

  return { hours, minutes, dateStr };
}

function getStartAndEndOfDayUnix(
  dateStr: string,
  timezone: string,
): { oldest: string; latest: string } {
  // Build a Date for midnight in the target timezone by binary-searching the offset
  const toUtcEpoch = (localDateTimeStr: string, tz: string): number => {
    // Parse as UTC first, then adjust by the timezone offset
    const asUtc = new Date(localDateTimeStr + "Z");
    // Get the offset: how many ms ahead the timezone is from UTC
    const utcStr = asUtc.toLocaleString("en-US", { timeZone: "UTC" });
    const tzStr = asUtc.toLocaleString("en-US", { timeZone: tz });
    const offsetMs = new Date(tzStr).getTime() - new Date(utcStr).getTime();
    // The actual UTC time = local time - offset
    const result = asUtc.getTime() - offsetMs;
    // Re-check with the result to handle DST edge cases
    const check = new Date(result);
    const utcStr2 = check.toLocaleString("en-US", { timeZone: "UTC" });
    const tzStr2 = check.toLocaleString("en-US", { timeZone: tz });
    const offsetMs2 = new Date(tzStr2).getTime() - new Date(utcStr2).getTime();
    return asUtc.getTime() - offsetMs2;
  };

  const oldestMs = toUtcEpoch(`${dateStr}T00:00:00`, timezone);
  const latestMs = toUtcEpoch(`${dateStr}T23:59:59`, timezone);

  return {
    oldest: String(oldestMs / 1000),
    latest: String(latestMs / 1000),
  };
}

type WorkspaceWithIntegrations = Workspace & {
  slack_integrations: SlackIntegration[];
};

export async function POST(request: Request) {
  try {
    // Authenticate cron request
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();
    const now = new Date();

    // Get paid workspaces with their Slack integrations
    const { data: rawWorkspaces, error: wsError } = await admin
      .from("workspaces")
      .select(
        "id, name, plan, report_generation_time, timezone, report_template, slack_integrations(id, encrypted_bot_token, selected_channel_ids)",
      )
      .in("plan", ["free", "starter", "team"]);

    if (wsError) {
      console.error("Failed to fetch workspaces:", wsError);
      return NextResponse.json(
        { error: "Failed to fetch workspaces" },
        { status: 500 },
      );
    }

    const workspaces = (rawWorkspaces ?? []) as unknown as WorkspaceWithIntegrations[];

    // Filter workspaces whose local time matches their report_generation_time
    // In dev mode, allow ?force=true to bypass time check
    const { searchParams } = new URL(request.url);
    const force = searchParams.get("force") === "true";

    const matchingWorkspaces = force
      ? workspaces
      : workspaces.filter((ws) => {
          try {
            const { hours, minutes } = getTimeInTimezone(now, ws.timezone);
            const [targetH, targetM] = ws.report_generation_time
              .split(":")
              .map(Number);
            const targetMinutes = targetH * 60 + targetM;
            const currentMinutes = hours * 60 + minutes;
            return Math.abs(currentMinutes - targetMinutes) <= 15;
          } catch {
            return false;
          }
        });

    const results = {
      processed: 0,
      reportsGenerated: 0,
      errors: [] as string[],
    };

    for (const workspace of matchingWorkspaces) {
      const integrations = workspace.slack_integrations;
      if (!integrations || integrations.length === 0) continue;

      for (const integration of integrations) {
        const channelIds = integration.selected_channel_ids ?? [];
        if (channelIds.length === 0) continue;

        try {
          const slackClient = createSlackClient(
            integration.encrypted_bot_token,
          );

          const { dateStr: reportDate } = getTimeInTimezone(
            now,
            workspace.timezone,
          );
          const { oldest, latest } = getStartAndEndOfDayUnix(
            reportDate,
            workspace.timezone,
          );

          // Fetch user list for mention resolution
          let userNameMap: Map<string, string> | undefined;
          try {
            const usersResult = await slackClient.users.list({});
            if (usersResult.members) {
              userNameMap = new Map();
              for (const member of usersResult.members) {
                if (member.id && (member.real_name || member.name)) {
                  userNameMap.set(
                    member.id,
                    member.real_name || member.name || "メンバー",
                  );
                }
              }
            }
          } catch {
            // Non-fatal: proceed without user name resolution
          }

          // Collect messages from all selected channels
          const allMessages = [];
          for (const channelId of channelIds) {
            try {
              const messages = await fetchChannelMessages(
                slackClient,
                channelId,
                oldest,
                latest,
              );
              allMessages.push(...messages);
            } catch (channelError) {
              console.error(
                `Failed to fetch messages from channel ${channelId}:`,
                channelError,
              );
              results.errors.push(
                `Channel ${channelId} in workspace ${workspace.id}: ${
                  channelError instanceof Error
                    ? channelError.message
                    : String(channelError)
                }`,
              );
            }
          }

          // Preprocess all messages
          const preprocessed = preprocessMessages(allMessages, userNameMap);

          // Group messages by user
          const messagesByUser = new Map<string, typeof preprocessed>();
          for (const msg of preprocessed) {
            const existing = messagesByUser.get(msg.userId) ?? [];
            existing.push(msg);
            messagesByUser.set(msg.userId, existing);
          }

          // Generate reports for each user
          for (const [slackUserId, userMessages] of messagesByUser) {
            try {
              const userName =
                userNameMap?.get(slackUserId) ?? "メンバー";

              if (userMessages.length < 2) continue;

              const report = await generateDailyReport(
                userMessages,
                userName,
                reportDate,
                workspace.report_template ?? DEFAULT_TEMPLATE,
              );

              // Find workspace members to map report to a NipoAI user
              const { data: rawMembers } = await admin
                .from("user_workspace_memberships")
                .select("user_id")
                .eq("workspace_id", workspace.id);

              const members = (rawMembers ?? []) as Pick<
                UserWorkspaceMembership,
                "user_id"
              >[];
              const userId = members[0]?.user_id;
              if (!userId) continue;

              const row: DailyReportInsert = {
                workspace_id: workspace.id,
                user_id: userId,
                report_date: reportDate,
                status: "draft",
                content: report.content,
                ai_model: report.model,
                token_usage: report.tokenUsage,
              };

              const { error: insertError } = await admin
                .from("daily_reports")
                .upsert(row as never, {
                  onConflict: "workspace_id,user_id,report_date",
                });

              if (insertError) {
                console.error(
                  `Failed to save report for user ${slackUserId}:`,
                  insertError,
                );
                results.errors.push(
                  `Save report for ${slackUserId} in workspace ${workspace.id}: ${insertError.message}`,
                );
              } else {
                results.reportsGenerated++;
              }
            } catch (userError) {
              console.error(
                `Failed to generate report for user ${slackUserId}:`,
                userError,
              );
              results.errors.push(
                `Generate report for ${slackUserId} in workspace ${workspace.id}: ${
                  userError instanceof Error
                    ? userError.message
                    : String(userError)
                }`,
              );
            }
          }

          results.processed++;
        } catch (integrationError) {
          console.error(
            `Failed to process integration for workspace ${workspace.id}:`,
            integrationError,
          );
          results.errors.push(
            `Integration in workspace ${workspace.id}: ${
              integrationError instanceof Error
                ? integrationError.message
                : String(integrationError)
            }`,
          );
        }
      }
    }

    return NextResponse.json({
      ok: true,
      workspacesMatched: matchingWorkspaces.length,
      ...results,
    });
  } catch (error) {
    console.error("Cron generate-reports fatal error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
