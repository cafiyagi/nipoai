import type { WebClient } from "@slack/web-api";

export interface SlackMessage {
  userId: string;
  text: string;
  timestamp: string;
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
): Promise<SlackMessage[]> {
  // Ensure bot is in the channel before fetching messages
  try {
    await client.conversations.join({ channel: channelId });
  } catch (joinError) {
    // Private channels can't be joined via API — that's OK if bot is already a member.
    // Log for debugging but don't block.
    console.warn(
      `conversations.join failed for ${channelId} (may be private):`,
      joinError instanceof Error ? joinError.message : joinError,
    );
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

        const isRateLimited =
          error instanceof Error &&
          "code" in error &&
          (error as { code: string }).code === "slack_webapi_rate_limited";

        if (isRateLimited && retries < MAX_RETRIES) {
          const retryAfter =
            (error as { retryAfter?: number }).retryAfter ?? retries;
          const backoff = Math.min(
            BASE_BACKOFF_MS * Math.pow(2, retries - 1),
            retryAfter * 1000,
          );
          await sleep(backoff);
          continue;
        }

        if (retries >= MAX_RETRIES) {
          throw new Error(
            `Failed to fetch messages from channel ${channelId} after ${MAX_RETRIES} retries: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        }

        throw error;
      }
    }

    // Rate limit protection between paginated requests
    if (hasMore) {
      await sleep(RATE_LIMIT_INTERVAL_MS);
    }
  }

  return messages;
}
