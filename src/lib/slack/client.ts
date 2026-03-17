import { WebClient } from "@slack/web-api";
import { decrypt } from "./encryption";

export function createSlackClient(encryptedBotToken: string): WebClient {
  const token = decrypt(encryptedBotToken);
  return new WebClient(token, {
    retryConfig: {
      retries: 2,
      factor: 2,
    },
  });
}

export async function inviteBotToChannel(params: {
  botClient: WebClient;
  userToken: string | null;
  botUserId: string | null;
  channelId: string;
}): Promise<{ success: boolean; error?: string }> {
  // Step 1: Try conversations.join (works for public channels)
  try {
    await params.botClient.conversations.join({ channel: params.channelId });
    return { success: true };
  } catch {
    // join failed — try invite for private channels
  }

  // Step 2: For private channels, use user token to invite bot
  if (params.userToken && params.botUserId) {
    try {
      const userClient = new WebClient(params.userToken);
      await userClient.conversations.invite({
        channel: params.channelId,
        users: params.botUserId,
      });
      return { success: true };
    } catch (inviteError) {
      const err = inviteError as { data?: { error?: string } };
      if (err.data?.error === "already_in_channel") {
        return { success: true };
      }
      return { success: false, error: err.data?.error ?? "unknown" };
    }
  }

  return { success: false, error: "no_user_token" };
}
