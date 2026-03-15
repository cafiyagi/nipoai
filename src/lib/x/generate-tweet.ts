import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

const MODEL = "gpt-4o-mini";
const REPLENISH_TARGET = 7;
const SIMILARITY_THRESHOLD = 0.4;
const MAX_RETRIES = 3;

const CATEGORIES = [
  "dev",
  "biz",
  "life",
  "dev2",
  "why",
  "num",
  "engagement",
] as const;

type Category = (typeof CATEGORIES)[number];

const SYSTEM_PROMPT = `あなたはNipoAI（Slackの会話からAIが日報を自動生成するSaaS）の個人開発者ryutoです。
X(Twitter)で日本語のツイートを書いています。

ルール:
- 140文字以内を目指す（最大280文字）
- 宣伝臭を出さない。体験談・共感・気づきベースで書く
- ハッシュタグは使わない
- URLは入れない
- 絵文字は使わない
- 「NipoAI」は5回に1回だけ言及
- 一人称は「自分」か省略
- 構造的に整理しすぎない。思いつきで書いた感じ
- 箇条書き禁止
- 「素朴な疑問ですが」等の丁寧な枕詞禁止
- 評論家目線禁止。当事者として書く
- 感情を出す（「やばい」「つらい」「うれしい」等）`;

const CATEGORY_PROMPTS: Record<Category, string> = {
  dev: "開発中にハマったこと、技術的な発見、Slack API・Supabase・Next.jsに関する体験を1ツイート書いて。具体的なエピソードで。",
  biz: "日報文化への考察、チーム運営、働き方について思ったことを1ツイート書いて。実体験ベースで。",
  life: "個人開発の孤独さや楽しさ、マーケティングの苦労について1ツイート書いて。感情込めて。",
  dev2: "LLMのプロンプト調整、パフォーマンスチューニング、API設計など技術的な話題を1ツイート書いて。",
  why: "なぜこの機能を作るのか、プロダクトの思想や設計判断について1ツイート書いて。作り手の視点で。",
  num: "「今週のNipoAI: 登録X人、DAU X人」のような数字報告ツイートを1つ書いて。数字は架空でリアルな範囲で。成長感を出す。",
  engagement:
    "他の個人開発者やエンジニアに向けた質問・意見を求めるツイートを1つ書いて。共感を呼ぶ内容で。",
};

function tokenize(text: string): Set<string> {
  const cleaned = text
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .toLowerCase();
  const tokens = new Set<string>();
  // Bigram tokenization for Japanese
  for (let i = 0; i < cleaned.length - 1; i++) {
    const bigram = cleaned.slice(i, i + 2).trim();
    if (bigram.length === 2) {
      tokens.add(bigram);
    }
  }
  return tokens;
}

function jaccardSimilarity(a: string, b: string): number {
  const setA = tokenize(a);
  const setB = tokenize(b);
  if (setA.size === 0 && setB.size === 0) return 0;

  let intersection = 0;
  for (const token of setA) {
    if (setB.has(token)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function isDuplicate(newTweet: string, existing: string[]): boolean {
  return existing.some(
    (tweet) => jaccardSimilarity(newTweet, tweet) > SIMILARITY_THRESHOLD,
  );
}

interface ReplenishResult {
  generated: number;
  skipped: number;
}

export async function replenishTweetQueue(): Promise<ReplenishResult> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Check current queue size
  const { count: pendingCount } = await supabase
    .from("scheduled_posts")
    .select("*", { count: "exact", head: true })
    .eq("platform", "x")
    .eq("status", "pending");

  if (pendingCount !== null && pendingCount >= REPLENISH_TARGET) {
    console.log(
      `[replenish-x] Queue has ${pendingCount} pending, no replenish needed`,
    );
    return { generated: 0, skipped: 0 };
  }

  // Fetch recent posts for dedup
  const { data: recentPosts } = await supabase
    .from("scheduled_posts")
    .select("content")
    .eq("platform", "x")
    .order("created_at", { ascending: false })
    .limit(30);

  const existingContents = (recentPosts ?? []).map((p) => p.content);

  // Find last pending post's scheduled_at for scheduling
  const { data: lastPending } = await supabase
    .from("scheduled_posts")
    .select("scheduled_at")
    .eq("platform", "x")
    .eq("status", "pending")
    .order("scheduled_at", { ascending: false })
    .limit(1);

  let nextDate: Date;
  if (lastPending && lastPending.length > 0 && lastPending[0].scheduled_at) {
    nextDate = new Date(lastPending[0].scheduled_at);
    nextDate.setUTCDate(nextDate.getUTCDate() + 1);
  } else {
    // Start from tomorrow 09:00 UTC
    nextDate = new Date();
    nextDate.setUTCDate(nextDate.getUTCDate() + 1);
    nextDate.setUTCHours(9, 0, 0, 0);
  }

  // Determine which categories to use (rotate through all 7)
  const { data: lastGenerated } = await supabase
    .from("scheduled_posts")
    .select("category")
    .eq("platform", "x")
    .eq("source", "ai_generated")
    .order("created_at", { ascending: false })
    .limit(1);

  const lastCategory = lastGenerated?.[0]?.category as Category | undefined;
  let startIdx = lastCategory
    ? (CATEGORIES.indexOf(lastCategory) + 1) % CATEGORIES.length
    : 0;

  const openai = new OpenAI();
  let generated = 0;
  let skipped = 0;

  for (let i = 0; i < REPLENISH_TARGET; i++) {
    const category = CATEGORIES[(startIdx + i) % CATEGORIES.length];
    // NipoAI mention: only on every 5th tweet (category index 0, 5, ...)
    const shouldMentionNipoAI = i % 5 === 0;
    const mentionNote = shouldMentionNipoAI
      ? ""
      : "\n\n追加指示: このツイートでは「NipoAI」というプロダクト名を含めないで。";

    let tweet: string | null = null;

    for (let retry = 0; retry < MAX_RETRIES; retry++) {
      const response = await openai.chat.completions.create({
        model: MODEL,
        temperature: 1.0,
        max_tokens: 400,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: CATEGORY_PROMPTS[category] + mentionNote,
          },
        ],
      });

      const content = response.choices[0]?.message?.content?.trim();
      if (!content) continue;

      // Strip quotes if GPT wraps the tweet
      const cleaned = content.replace(/^["「『]|["」』]$/g, "");

      if (cleaned.length > 280) {
        console.log(
          `[replenish-x] Tweet too long (${cleaned.length}), retrying`,
        );
        continue;
      }

      if (isDuplicate(cleaned, existingContents)) {
        console.log(
          `[replenish-x] Duplicate detected for category ${category}, retrying`,
        );
        continue;
      }

      tweet = cleaned;
      break;
    }

    if (!tweet) {
      console.warn(
        `[replenish-x] Failed to generate unique tweet for category ${category} after ${MAX_RETRIES} retries`,
      );
      skipped++;
      continue;
    }

    // Schedule the tweet
    const scheduledAt = new Date(nextDate);

    const { error: insertError } = await supabase
      .from("scheduled_posts")
      .insert({
        platform: "x",
        content: tweet,
        scheduled_at: scheduledAt.toISOString(),
        status: "pending",
        source: "ai_generated",
        category,
      });

    if (insertError) {
      console.error(
        `[replenish-x] Failed to insert tweet:`,
        insertError.message,
      );
      skipped++;
      continue;
    }

    // Add to dedup list
    existingContents.push(tweet);
    generated++;

    // Advance to next day
    nextDate.setUTCDate(nextDate.getUTCDate() + 1);

    console.log(
      `[replenish-x] Generated tweet #${generated} (${category}): ${tweet.slice(0, 50)}...`,
    );
  }

  console.log(
    `[replenish-x] Done: ${generated} generated, ${skipped} skipped`,
  );
  return { generated, skipped };
}
