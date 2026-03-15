import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { createClient } from "@supabase/supabase-js";
import { getXClient } from "@/lib/x/client";
import { replenishTweetQueue } from "@/lib/x/generate-tweet";

const QUEUE_LOW_THRESHOLD = 7;

function verifySecret(header: string | null, expected: string): boolean {
  if (!header || !header.startsWith("Bearer ")) return false;
  const provided = header.slice(7);
  if (provided.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
}

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error("[cron/post-x] CRON_SECRET is not configured");
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  if (!verifySecret(req.headers.get("authorization"), cronSecret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    console.error("[cron/post-x] Supabase credentials missing");
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Atomically claim next pending post (prevents race condition)
  const { data: posts, error: claimError } = await supabase.rpc(
    "claim_next_post",
    { p_platform: "x" },
  );

  const post = posts?.[0];
  if (claimError || !post) {
    return NextResponse.json({ message: "No pending posts" });
  }

  try {
    const client = getXClient();
    const { data } = await client.v2.tweet(post.content);

    const { error: updateError } = await supabase
      .from("scheduled_posts")
      .update({
        status: "posted",
        posted_at: new Date().toISOString(),
        post_id: data.id,
      })
      .eq("id", post.id);

    if (updateError) {
      console.error("[cron/post-x] DB update failed after tweet success:", {
        tweet_id: data.id,
        post_id: post.id,
        error: updateError.message,
      });
    }

    // Check queue remaining
    const { count: remaining } = await supabase
      .from("scheduled_posts")
      .select("*", { count: "exact", head: true })
      .eq("platform", "x")
      .eq("status", "pending");

    // Auto-replenish queue if running low
    let replenishResult = null;
    if (remaining !== null && remaining < QUEUE_LOW_THRESHOLD) {
      console.log(`[cron/post-x] Queue low (${remaining}), triggering replenish`);
      try {
        replenishResult = await replenishTweetQueue();
      } catch (replenishError) {
        console.error(
          "[cron/post-x] Replenish failed:",
          replenishError instanceof Error ? replenishError.message : replenishError,
        );
      }
    }

    return NextResponse.json({
      success: true,
      remaining: remaining ?? 0,
      replenish: replenishResult,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    const { error: updateError } = await supabase
      .from("scheduled_posts")
      .update({ status: "failed", error: message })
      .eq("id", post.id);

    if (updateError) {
      console.error("[cron/post-x] Failed to record error:", updateError.message);
    }

    console.error("[cron/post-x] Tweet failed:", { post_id: post.id, message });
    return NextResponse.json({ error: "Failed to post" }, { status: 500 });
  }
}
