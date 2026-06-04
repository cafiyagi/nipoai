import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { getXClient } from "@/lib/x/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_LEN = 280;
const MODEL = "gpt-4o-mini";
const LINK = "getcreatax.com";
const CTA = `\n\n→ ${LINK}`;
const BODY_MAX = MAX_LEN - CTA.length; // room for the appended CTA

// Promo angles (creator income / tax pain) rotated at random for variety.
const THEMES = [
  "配信の収益がYouTubeとpixivFANBOXでバラバラになって、確定申告期に詰む話",
  "投げ銭やメンバーシップ収益の確定申告を、配信者の多くが見て見ぬふりしている話",
  "機材・衣装・コラボ費など、経費の仕分けが地獄になる話",
  "スプレッドシート手作業での収益管理がそろそろ限界という話",
  "税理士に渡す資料づくりが毎年しんどい話",
  "freeeやマネーフォワードに取り込むCSVが無くて手入力で消耗する話",
  "収益は増えたのに、いくら稼いでいるか正確に把握できていない不安",
  "確定申告のために徹夜で集計する、あの季節のつらさ",
];

const SYSTEM_PROMPT = `あなたは日本の個人開発者本人として、X(Twitter)で自分が作っているプロダクト「Creatax」を紹介します。

Creataxとは:
- VTuber/配信者などのクリエイター向けの収益ダッシュボード。
- YouTubeやpixivFANBOXなど複数プラットフォームの収益を1画面で集計。
- AIが経費を自動分類し、確定申告用のPDFとCSV(freee/マネーフォワード等の取込用)を出力。
- いまは早期段階で、ウェイトリストを募集中。

ルール:
- 配信者・クリエイターの「収益管理や確定申告のつらさ」に共感する切り口で書く。当事者・作り手の目線。
- 宣伝臭を抑え、「自分が作っている」という build in public のトーンで自然に紹介する。
- 本文は120文字程度(このあとURLを付けるので短めに)。
- 誇大広告は禁止。まだ早期なので「全自動で完璧」などとは言わない。
- ハッシュタグ禁止。URL禁止(URLはこちらで付ける)。絵文字禁止。箇条書き禁止。丁寧な枕詞禁止。
- プロダクト名は「Creatax」を使う。「vtuber.cash」「NipoAI」など他の名前は絶対に出さない。
- 毎回切り口を変える。書き出しのパターンを使い回さない。
- 出力はツイート本文のみ。前置き・説明・引用符・URLは付けない。`;

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

async function generateBody(openai: OpenAI): Promise<string> {
  const theme = THEMES[Math.floor(Math.random() * THEMES.length)];
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await openai.chat.completions.create({
      model: MODEL,
      temperature: 1.0,
      max_tokens: 400,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `今日の切り口:「${theme}」。これをベースに、毎回違う書き出しで、Creataxの紹介ツイートを1本だけ書いて。`,
        },
      ],
    });
    let text = clean(res.choices[0]?.message?.content ?? "");
    // The model must not sneak in URLs or forbidden names.
    text = text.replace(/https?:\/\/\S+/g, "").replace(/getcreatax\.com/gi, "").trim();
    if (/nipoai|vtuber\.?cash/i.test(text)) continue;
    if (text && text.length <= BODY_MAX) return text;
  }
  throw new Error("Failed to generate a valid promo body after retries");
}

/**
 * POST /api/x/post-creatax
 *
 * Generates one build-in-public promo tweet for Creatax (creator revenue
 * dashboard) with OpenAI, appends the getcreatax.com CTA, and posts it.
 * Triggered 1x/day by a GitHub Actions cron. Keys stay on Vercel.
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
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "Server misconfigured: OPENAI_API_KEY" },
      { status: 500 },
    );
  }

  let text: string;
  try {
    const body = await generateBody(new OpenAI());
    text = `${body}${CTA}`;
    if (text.length > MAX_LEN) text = `${body.slice(0, BODY_MAX - 1)}…${CTA}`;
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown error";
    console.error("[post-creatax] generation failed:", detail);
    return NextResponse.json({ error: "Generation failed", detail }, { status: 502 });
  }

  let tweetId: string;
  try {
    const { data } = await getXClient().v2.tweet(text);
    tweetId = data.id;
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown error";
    console.error("[post-creatax] tweet failed:", detail);
    return NextResponse.json({ error: "Tweet failed", detail, text }, { status: 502 });
  }

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
        source: "creatax_promo",
        category: "promo",
        post_id: tweetId,
      });
    }
  } catch (logError) {
    console.error(
      "[post-creatax] DB log failed (non-fatal):",
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
