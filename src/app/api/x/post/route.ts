import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { createClient } from "@supabase/supabase-js";
import { getXClient } from "@/lib/x/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_LEN = 280;

function verifyToken(header: string | null, expected: string): boolean {
  if (!header || !header.startsWith("Bearer ")) return false;
  const provided = header.slice(7);
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * POST /api/x/post
 *
 * Publishes a single tweet immediately. Intended for an external scheduler
 * (a remote Claude Code routine) that generates "empathy" posts about AI and
 * indie development and posts 2-3x/day. This is deliberately separate from the
 * queue-based /api/cron/post-x flow and must never promote the product.
 *
 * Auth:  Authorization: Bearer <EMPATHY_POST_TOKEN>
 * Body:  { "text": string }   // <= 280 chars, must not mention the product
 * Reply: { success, id, url } | { error }
 */
export async function POST(req: NextRequest) {
  const token = process.env.EMPATHY_POST_TOKEN;
  if (!token) {
    console.error("[api/x/post] EMPATHY_POST_TOKEN is not configured");
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  if (!verifyToken(req.headers.get("authorization"), token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { text?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text) {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }
  if (text.length > MAX_LEN) {
    return NextResponse.json(
      { error: `text too long (${text.length} > ${MAX_LEN})` },
      { status: 400 },
    );
  }
  // Safety net: this stream must never mention the product.
  if (/nipoai/i.test(text)) {
    return NextResponse.json(
      { error: "text must not mention the product name" },
      { status: 422 },
    );
  }

  let tweetId: string;
  try {
    const client = getXClient();
    const { data } = await client.v2.tweet(text);
    tweetId = data.id;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[api/x/post] Tweet failed:", message);
    return NextResponse.json(
      { error: "Failed to post tweet", detail: message },
      { status: 502 },
    );
  }

  // Best-effort: record the post so it shows up alongside the queue history.
  // Never fail the request if logging fails.
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
      "[api/x/post] DB log failed (non-fatal):",
      logError instanceof Error ? logError.message : logError,
    );
  }

  return NextResponse.json({
    success: true,
    id: tweetId,
    url: `https://x.com/i/web/status/${tweetId}`,
  });
}
