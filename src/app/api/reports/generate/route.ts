import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createSlackClient } from "@/lib/slack/client";
import { fetchChannelMessages } from "@/lib/slack/messages";
import { preprocessMessages } from "@/lib/slack/preprocessing";
import { generateDailyReport } from "@/lib/ai/generate-report";
import { DEFAULT_TEMPLATE } from "@/lib/report-template";
import { rateLimit } from "@/lib/rate-limit";
import type {
  Workspace,
  SlackIntegration,
  DailyReportInsert,
  ReportStatus,
} from "@/lib/supabase/types";

export const maxDuration = 300; // 5 minutes for Vercel

// ---------------------------------------------------------------------------
// Helpers (reused from cron route)
// ---------------------------------------------------------------------------

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
  const toUtcEpoch = (localDateTimeStr: string, tz: string): number => {
    const asUtc = new Date(localDateTimeStr + "Z");
    const utcStr = asUtc.toLocaleString("en-US", { timeZone: "UTC" });
    const tzStr = asUtc.toLocaleString("en-US", { timeZone: tz });
    const offsetMs = new Date(tzStr).getTime() - new Date(utcStr).getTime();
    const result = asUtc.getTime() - offsetMs;
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

// ---------------------------------------------------------------------------
// POST /api/reports/generate — Manual report generation for current user
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const regenerate = url.searchParams.get("regenerate") === "true";

    // Authenticate via Supabase session (not cron secret)
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
    }

    // M-1: Rate limit — 10 requests per minute per user
    const rl = rateLimit(`generate:${user.id}`, {
      limit: 10,
      windowMs: 60_000,
    });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "リクエストが多すぎます。しばらくしてから再度お試しください。" },
        { status: 429 },
      );
    }

    // Get user's workspace
    const { data: rawMemberships } = await supabase
      .from("user_workspace_memberships")
      .select("workspace_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    if (!rawMemberships) {
      return NextResponse.json(
        { error: "ワークスペースが見つかりません" },
        { status: 400 },
      );
    }

    const membership = rawMemberships as unknown as { workspace_id: string };
    const workspaceId = membership.workspace_id;

    // Get workspace details
    const admin = createAdminClient();
    const { data: rawWorkspace } = await admin
      .from("workspaces")
      .select("id, name, plan, report_generation_time, timezone, report_template")
      .eq("id", workspaceId)
      .single();

    if (!rawWorkspace) {
      return NextResponse.json(
        { error: "ワークスペースが見つかりません" },
        { status: 400 },
      );
    }

    const workspace = rawWorkspace as unknown as Workspace;

    // Get Slack integration
    const { data: rawIntegration } = await admin
      .from("slack_integrations")
      .select("id, encrypted_bot_token, selected_channel_ids")
      .eq("workspace_id", workspaceId)
      .limit(1)
      .maybeSingle();

    if (!rawIntegration) {
      return NextResponse.json(
        { error: "Slack連携が見つかりません。設定画面からSlackを連携してください。", code: "NO_SLACK" },
        { status: 400 },
      );
    }

    const integration = rawIntegration as unknown as Pick<
      SlackIntegration,
      "id" | "encrypted_bot_token" | "selected_channel_ids"
    >;

    const channelIds = integration.selected_channel_ids ?? [];
    if (channelIds.length === 0) {
      return NextResponse.json(
        { error: "Slackチャンネルが選択されていません。設定画面でチャンネルを選択してください。", code: "NO_CHANNELS" },
        { status: 400 },
      );
    }

    // Check if today's report already exists
    const now = new Date();
    const { dateStr: reportDate } = getTimeInTimezone(now, workspace.timezone);

    const { data: rawExistingReport } = await admin
      .from("daily_reports")
      .select("id, status")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .eq("report_date", reportDate)
      .maybeSingle();

    if (rawExistingReport) {
      const existing = rawExistingReport as unknown as {
        id: string;
        status: ReportStatus;
      };

      // If submitted or delivered, conflict — cannot regenerate
      if (existing.status === "submitted" || existing.status === "delivered") {
        return NextResponse.json(
          {
            error: "本日の日報は既に提出済みです。",
            reportId: existing.id,
          },
          { status: 409 },
        );
      }

      // If draft and NOT requesting regeneration, return existing
      if (
        (existing.status === "draft" || existing.status === "generating") &&
        !regenerate
      ) {
        return NextResponse.json({
          ok: true,
          reportId: existing.id,
          status: "existing" as const,
        });
      }

      // If draft + regenerate=true, fall through to regenerate
    }

    // --- Generate the report (same pipeline as cron) ---

    const slackClient = createSlackClient(integration.encrypted_bot_token);
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
          `Manual generate: Failed to fetch messages from channel ${channelId}:`,
          channelError,
        );
      }
    }

    // Preprocess all messages
    const preprocessed = preprocessMessages(allMessages, userNameMap);

    // Filter messages for this user only
    // Since we don't have a Slack user ID mapping, generate for all messages
    // attributed to the current user. In the cron route, reports are generated
    // per Slack user — here we generate a single report for the authenticated user.
    const { data: rawProfile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .single();
    const profileData = rawProfile as unknown as { display_name: string | null } | null;
    const userName = profileData?.display_name ?? "メンバー";

    if (preprocessed.length < 2) {
      return NextResponse.json(
        {
          error:
            "本日のSlackメッセージが少なすぎるため、日報を生成できません。もう少し活動してから再度お試しください。",
        },
        { status: 400 },
      );
    }

    const report = await generateDailyReport(
      preprocessed,
      userName,
      reportDate,
      workspace.report_template ?? DEFAULT_TEMPLATE,
    );

    const row: DailyReportInsert = {
      workspace_id: workspaceId,
      user_id: user.id,
      report_date: reportDate,
      status: "draft",
      content: report.content,
      ai_model: report.model,
      token_usage: report.tokenUsage,
    };

    const { data: upsertedReport, error: insertError } = await admin
      .from("daily_reports")
      .upsert(row as never, {
        onConflict: "workspace_id,user_id,report_date",
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Manual generate: Failed to save report:", insertError);
      return NextResponse.json(
        { error: "日報の保存に失敗しました" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      reportId: (upsertedReport as { id: string }).id,
      status: "created" as const,
    });
  } catch (error) {
    console.error("Manual generate-report fatal error:", error);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 },
    );
  }
}
