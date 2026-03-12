import type { SlackMessage } from "./messages";

export interface PreprocessedMessage {
  userId: string;
  text: string;
  timestamp: string;
}

// PII patterns
const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PHONE_PATTERN =
  /(?:\+?\d{1,4}[-.\s]?)?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}/g;

// Slack formatting patterns
const MENTION_PATTERN = /<@([A-Z0-9]+)(?:\|([^>]+))?>/g;
const LINK_PATTERN = /<(https?:\/\/[^|>]+)\|([^>]+)>/g;
const BARE_LINK_PATTERN = /<(https?:\/\/[^>]+)>/g;

// Emoji-only pattern (custom :emoji: and unicode emoji)
const EMOJI_ONLY_PATTERN =
  /^[\s]*(?::[a-zA-Z0-9_+-]+:|[\u{1F300}-\u{1FAD6}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{200D}\u{20E3}\u{E0020}-\u{E007F}])+[\s]*$/u;

function replaceSlackMentions(
  text: string,
  userNameMap?: Map<string, string>,
): string {
  return text.replace(MENTION_PATTERN, (_match, userId, displayName) => {
    if (displayName) return displayName;
    if (userNameMap?.has(userId)) return userNameMap.get(userId)!;
    return "メンバー";
  });
}

function replaceSlackLinks(text: string): string {
  // First replace links with display text: <url|text> -> text
  let result = text.replace(LINK_PATTERN, (_match, _url, displayText) => {
    return displayText;
  });
  // Then replace bare links: <url> -> url
  result = result.replace(BARE_LINK_PATTERN, (_match, url) => {
    return url;
  });
  return result;
}

function maskPII(text: string): string {
  let result = text.replace(EMAIL_PATTERN, "[MASKED]");
  result = result.replace(PHONE_PATTERN, (match) => {
    // Only mask if it looks like an actual phone number (at least 7 digits)
    const digits = match.replace(/\D/g, "");
    return digits.length >= 7 ? "[MASKED]" : match;
  });
  return result;
}

function isNoise(text: string): boolean {
  const trimmed = text.trim();

  // Too short to be meaningful
  if (trimmed.length <= 3) return true;

  // Emoji-only posts
  if (EMOJI_ONLY_PATTERN.test(trimmed)) return true;

  return false;
}

export function preprocessMessages(
  messages: SlackMessage[],
  userNameMap?: Map<string, string>,
): PreprocessedMessage[] {
  const results: PreprocessedMessage[] = [];

  for (const msg of messages) {
    let text = msg.text;

    // Apply transformations in order
    text = replaceSlackMentions(text, userNameMap);
    text = replaceSlackLinks(text);
    text = maskPII(text);
    text = text.trim();

    // Filter noise after transformations
    if (isNoise(text)) continue;

    results.push({
      userId: msg.userId,
      text,
      timestamp: msg.timestamp,
    });
  }

  return results;
}
