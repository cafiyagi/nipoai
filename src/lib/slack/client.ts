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
