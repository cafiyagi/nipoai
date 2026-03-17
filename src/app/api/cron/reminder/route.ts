import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { createSlackClient } from "@/lib/slack/client";
import { decrypt } from "@/lib/slack/encryption";
import { syncSlackMembers } from "@/lib/slack/sync-members";

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

function verifySecret(header: string | null, expected: string): boolean {
  if (!header || !header.startsWith("Bearer ")) return false;
  const provided = header.slice(7);
  if (provided.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Parse "HH:MM" or "HH:MM:SS" into total minutes since midnight. */
function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

/** Get current time in a timezone as "HH:MM" and today's date as "YYYY-MM-DD". */
function nowInTimezone(tz: string): { timeStr: string; dateStr: string } {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";

  const dateStr = `${get("year")}-${get("month")}-${get("day")}`;
  const timeStr = `${get("hour")}:${get("minute")}`;

  return { timeStr, dateStr };
}

// ---------------------------------------------------------------------------
// GET /api/cron/reminder
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error("[cron/reminder] CRON_SECRET is not configured");
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  if (!verifySecret(req.headers.get("authorization"), cronSecret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  // 1. Fetch workspaces with reminder enabled + their slack integration
  const { data: rawWorkspaces, error: wsError } = await supabase
    .from("workspaces")
    .select("id, reminder_time, timezone, slack_integrations(encrypted_bot_token)")
    .eq("reminder_enabled", true);

  if (wsError) {
    console.error("[cron/reminder] Failed to fetch workspaces:", wsError);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }

  if (!rawWorkspaces || rawWorkspaces.length === 0) {
    return NextResponse.json({ message: "No workspaces with reminders enabled" });
  }

  type ReminderWorkspace = {
    id: string;
    reminder_time: string;
    timezone: string;
    slack_integrations: Array<{ encrypted_bot_token: string }>;
  };

  const workspaces = rawWorkspaces as unknown as ReminderWorkspace[];

  const TOLERANCE_MINUTES = 15;
  let totalReminded = 0;
  let totalSkipped = 0;

  for (const ws of workspaces) {
    try {
      // 2. Check if current time matches reminder_time within tolerance
      const { timeStr: currentTime, dateStr: today } = nowInTimezone(ws.timezone);
      const currentMinutes = timeToMinutes(currentTime);
      const reminderMinutes = timeToMinutes(ws.reminder_time);

      const diff = Math.abs(currentMinutes - reminderMinutes);
      if (diff > TOLERANCE_MINUTES) {
        totalSkipped++;
        continue;
      }

      // 3. Get Slack integration
      if (!ws.slack_integrations || ws.slack_integrations.length === 0) {
        continue;
      }

      const slack = createSlackClient(ws.slack_integrations[0].encrypted_bot_token);

      // 4. Sync Slack member IDs (ensure profiles.slack_user_id is up to date)
      await syncSlackMembers(slack, supabase, ws.id);

      // 5. Get members who have NOT submitted a report today
      const { data: rawMembers } = await supabase
        .from("user_workspace_memberships")
        .select("user_id, profiles(slack_user_id, display_name)")
        .eq("workspace_id", ws.id);

      type MemberWithProfile = {
        user_id: string;
        profiles: { slack_user_id: string | null; display_name: string | null } | null;
      };

      const members = (rawMembers ?? []) as unknown as MemberWithProfile[];
      if (members.length === 0) continue;

      // Get today's submitted reports for this workspace
      const { data: rawReports } = await supabase
        .from("daily_reports")
        .select("user_id")
        .eq("workspace_id", ws.id)
        .eq("report_date", today);

      const submittedUserIds = new Set(
        (rawReports ?? []).map((r: { user_id: string }) => r.user_id),
      );

      // 6. Send DMs to members who haven't submitted
      for (const member of members) {
        if (submittedUserIds.has(member.user_id)) continue;

        if (!member.profiles?.slack_user_id) continue;

        try {
          await slack.chat.postMessage({
            channel: member.profiles.slack_user_id,
            text: `${member.profiles.display_name ? `${member.profiles.display_name}さん、` : ""}本日の日報がまだ提出されていません。\n下記リンクから日報を作成してください。\nhttps://nipoai.app/dashboard`,
          });
          totalReminded++;
        } catch (dmError) {
          console.error(
            `[cron/reminder] Failed to DM user ${member.user_id}:`,
            dmError instanceof Error ? dmError.message : dmError,
          );
        }
      }
    } catch (perWsError) {
      console.error(
        `[cron/reminder] Error processing workspace ${ws.id}:`,
        perWsError instanceof Error ? perWsError.message : perWsError,
      );
    }
  }

  return NextResponse.json({
    success: true,
    reminded: totalReminded,
    skipped: totalSkipped,
    workspacesChecked: workspaces.length,
  });
}
