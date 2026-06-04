import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { getXClient } from "@/lib/x/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_LEN = 280;
const MODEL = "claude-sonnet-4-6";

// Sub-themes rotated at random so each post takes a fresh angle.
const THEMES = [
  "「AIで爆速」と言われる理想と、実際の地味な現実とのギャップ",
  "プロンプトを練り直し続けてしまうプロンプト沼",
  "何を作るかが決まらず手が止まっている時間のしんどさ",
  "リリースしても誰も使ってくれない孤独",
  "AIに任せたら逆に『自分は何がしたいのか』が問われる瞬間",
  "個人開発の時間のなさ・孤独・モチベ管理",
  "レビューしてくれる人が誰もいないつらさ",
  "AIと比べて自分の存在価値を考えてしまう夜",
  "機能を完成させるより、続けることのほうが難しい",
  "仕様を言語化しようとして、自分の頭の中の曖昧さに気づく",
  "AIが書いたコードを読んで理解するのに結局時間がかかる",
  "初めてのユーザーや初フィードバックの小さなうれしさ",
];

const SYSTEM_PROMPT = `あなたは日本の個人開発者本人として、X(Twitter)に共感系のツイートを書きます。

ルール:
- テーマはAI × 個人開発界隈。他の個人開発者・エンジニアが「わかる」と感じ、共感を呼ぶ内容。
- 100〜140文字を目安(絶対に280文字以内)。
- 当事者として、実体験やその瞬間の感情を書く。評論家目線は禁止。
- 感情を出す(つらい/うれしい/やばい/しんどい/楽しい など)。
- 一人称は「自分」または省略。
- ハッシュタグ禁止。URL禁止。絵文字禁止。箇条書き禁止。「素朴な疑問ですが」等の丁寧な枕詞禁止。
- 構造的に整理しすぎず、ふと思いついたような口調。
- 製品名・ブランド名・サービス名を一切出さない。宣伝は禁止。
- 出力はツイート本文のみ。前置き・説明・引用符は付けない。`;

function verifyToken(header: string | null, expected: string): boolean {
  if (!header || !header.startsWith("Bearer ")) return false;
  const provided = header.slice(7);
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function clean(s: string): string {
  return s
    .trim()
    .replace(/^["「『]+/, "")
    .replace(/["」』]+$/, "")
    .trim();
}

async function generateTweet(client: Anthropic): Promise<string> {
  const theme = THEMES[Math.floor(Math.random() * THEMES.length)];
  for (let attempt = 0; attempt < 3; attempt++) {
    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 400,
      temperature: 1,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `今日のサブテーマ:「${theme}」。これをベースに、毎回違う切り口で、共感系ツイートを1本だけ書いて。`,
        },
      ],
    });
    const block = msg.content.find((b) => b.type === "text");
    const text = block && block.type === "text" ? clean(block.text) : "";
    if (text && text.length <= MAX_LEN && !/nipoai/i.test(text)) return text;
  }
  throw new Error("Failed to generate a valid tweet after retries");
}

/**
 * POST /api/x/post-empathy
 *
 * Generates one empathy tweet (AI x indie dev) with Claude and posts it.
 * Self-contained: all API keys stay on Vercel. Triggered 2-3x/day by a
 * GitHub Actions cron. Never promotes the product.
 *
 * Auth: Authorization: Bearer <EMPATHY_POST_TOKEN>
 */
export async function POST(req: NextRequest) {
  const token = process.env.EMPATHY_POST_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: "Server misconfigured: EMPATHY_POST_TOKEN" },
      { status: 500 },
    );
  }
  if (!verifyToken(req.headers.get("authorization"), token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) {
    return NextResponse.json(
      { error: "Server misconfigured: ANTHROPIC_API_KEY" },
      { status: 500 },
    );
  }

  let text: string;
  try {
    text = await generateTweet(new Anthropic({ apiKey: anthropicKey }));
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown error";
    console.error("[post-empathy] generation failed:", detail);
    return NextResponse.json({ error: "Generation failed", detail }, { status: 502 });
  }

  let tweetId: string;
  try {
    const { data } = await getXClient().v2.tweet(text);
    tweetId = data.id;
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown error";
    console.error("[post-empathy] tweet failed:", detail);
    return NextResponse.json({ error: "Tweet failed", detail, text }, { status: 502 });
  }

  // Best-effort logging (never fail the request).
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const now = new Date().toISOString();
      await supabase.from("scheduled_posts").insert({
        platform: "x",
        content: text,
        scheduled_at: now,
        posted_at: now,
        status: "posted",
        source: "claude_empathy",
        category: "empathy",
        post_id: tweetId,
      });
    }
  } catch (logError) {
    console.error(
      "[post-empathy] DB log failed (non-fatal):",
      logError instanceof Error ? logError.message : logError,
    );
  }

  return NextResponse.json({
    success: true,
    id: tweetId,
    text,
    url: `https://x.com/i/web/status/${tweetId}`,
  });
}
