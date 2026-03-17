import { WebClient } from "@slack/web-api";

export interface SlackMessage {
  userId: string;
  text: string;
  timestamp: string;
}

export type SlackFetchErrorCode =
  | "not_in_channel"
  | "channel_not_found"
  | "invalid_auth"
  | "token_revoked"
  | "rate_limited"
  | "unknown";

export class SlackFetchError extends Error {
  code: SlackFetchErrorCode;
  channelId: string;

  constructor(message: string, code: SlackFetchErrorCode, channelId: string) {
    super(message);
    this.name = "SlackFetchError";
    this.code = code;
    this.channelId = channelId;
  }
}

const RATE_LIMIT_INTERVAL_MS = 1200;
const MAX_RETRIES = 3;
const BASE_BACKOFF_MS = 1000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchChannelMessages(
  client: WebClient,
  channelId: string,
  oldest: string,
  latest: string,
  inviteOptions?: {
    userToken: string | null;
    botUserId: string | null;
  },
): Promise<SlackMessage[]> {
  // Ensure bot is in the channel before fetching messages
  try {
    await client.conversations.join({ channel: channelId });
  } catch (joinError) {
    if (inviteOptions?.userToken && inviteOptions?.botUserId) {
      try {
        const userClient = new WebClient(inviteOptions.userToken);
        await userClient.conversations.invite({
          channel: channelId,
          users: inviteOptions.botUserId,
        });
      } catch (inviteError) {
        const err = inviteError as { data?: { error?: string } };
        if (err.data?.error !== "already_in_channel") {
          console.warn(`conversations.invite failed for ${channelId}:`, err.data?.error);
        }
      }
    } else {
      console.warn(
        `conversations.join failed for ${channelId} (may be private):`,
        joinError instanceof Error ? joinError.message : joinError,
      );
    }
  }

  const messages: SlackMessage[] = [];
  let cursor: string | undefined;
  let hasMore = true;

  while (hasMore) {
    let retries = 0;
    let success = false;

    while (retries < MAX_RETRIES && !success) {
      try {
        const result = await client.conversations.history({
          channel: channelId,
          oldest,
          latest,
          limit: 200,
          cursor,
        });

        if (result.messages) {
          for (const msg of result.messages) {
            // Skip bot messages, subtypes (join/leave/topic etc.), and empty messages
            if (msg.bot_id || msg.subtype || !msg.text || !msg.user) {
              continue;
            }

            messages.push({
              userId: msg.user,
              text: msg.text,
              timestamp: msg.ts ?? "",
            });
          }
        }

        hasMore = result.has_more === true;
        cursor = result.response_metadata?.next_cursor;

        if (!cursor) {
          hasMore = false;
        }

        success = true;
      } catch (error: unknown) {
        retries++;

        // Classify Slack API errors
        const slackError = error as { code?: string; data?: { error?: string }; retryAfter?: number };
        const apiError = slackError.data?.error ?? "";

        // Non-retryable auth/permission errors — fail immediately
        if (apiError === "not_in_channel" || apiError === "channel_not_found") {
          throw new SlackFetchError(
            `Channel ${channelId}: ${apiError}`,
            apiError as SlackFetchErrorCode,
            channelId,
          );
        }
        if (apiError === "invalid_auth" || apiError === "token_revoked" || apiError === "account_inactive") {
          throw new SlackFetchError(
            `Slack authentication failed: ${apiError}`,
            apiError === "token_revoked" ? "token_revoked" : "invalid_auth",
            channelId,
          );
        }

        const isRateLimited =
          slackError.code === "slack_webapi_rate_limited";

        if (isRateLimited && retries < MAX_RETRIES) {
          const retryAfter = slackError.retryAfter ?? retries;
          const backoff = Math.min(
            BASE_BACKOFF_MS * Math.pow(2, retries - 1),
            retryAfter * 1000,
          );
          await sleep(backoff);
          continue;
        }

        if (retries >= MAX_RETRIES) {
          const code: SlackFetchErrorCode = isRateLimited ? "rate_limited" : "unknown";
          throw new SlackFetchError(
            `Failed to fetch messages from channel ${channelId} after ${MAX_RETRIES} retries: ${
              error instanceof Error ? error.message : String(error)
            }`,
            code,
            channelId,
          );
        }

        throw new SlackFetchError(
          `Failed to fetch messages from channel ${channelId}: ${error instanceof Error ? error.message : String(error)}`,
          "unknown",
          channelId,
        );
      }
    }

    // Rate limit protection between paginated requests
    if (hasMore) {
      await sleep(RATE_LIMIT_INTERVAL_MS);
    }
  }

  return messages;
}
