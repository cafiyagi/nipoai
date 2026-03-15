import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { createClient } from "@supabase/supabase-js";
import { getXClient } from "@/lib/x/client";
import { generateQuoteTweet } from "@/lib/x/generate-quote-tweet";

function verifySecret(header: string | null, expected: string): boolean {
  if (!header || !header.startsWith("Bearer ")) return false;
  const provided = header.slice(7);
  if (provided.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
}

function extractTweetId(url: string): string | null {
  const match = url.match(/\/status\/(\d+)/);
  return match ? match[1] : null;
}

export async function POST(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json(
      { error: "Server misconfigured" },
      { status: 500 },
    );
  }

  if (!verifySecret(req.headers.get("authorization"), cronSecret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json(
      { error: "Server misconfigured" },
      { status: 500 },
    );
  }

  let body: { tweet_url: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const { tweet_url } = body;
  if (!tweet_url) {
    return NextResponse.json(
      { error: "tweet_url is required" },
      { status: 400 },
    );
  }

  const tweetId = extractTweetId(tweet_url);
  if (!tweetId) {
    return NextResponse.json(
      { error: "Invalid tweet URL" },
      { status: 400 },
    );
  }

  try {
    // Fetch the original tweet content via Twitter API v2
    const client = getXClient();
    const { data: tweetData } = await client.v2.singleTweet(tweetId, {
      "tweet.fields": ["text"],
    });

    if (!tweetData) {
      return NextResponse.json(
        { error: "Tweet not found" },
        { status: 404 },
      );
    }

    const tweetContent = tweetData.text;

    // Generate quote tweet text via AI
    const generatedText = await generateQuoteTweet(tweet_url, tweetContent);

    // Schedule: find next available slot
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: lastPending } = await supabase
      .from("scheduled_posts")
      .select("scheduled_at")
      .eq("platform", "x")
      .eq("status", "pending")
      .order("scheduled_at", { ascending: false })
      .limit(1);

    let scheduledAt: Date;
    if (lastPending && lastPending.length > 0 && lastPending[0].scheduled_at) {
      scheduledAt = new Date(lastPending[0].scheduled_at);
      scheduledAt.setUTCDate(scheduledAt.getUTCDate() + 1);
    } else {
      scheduledAt = new Date();
      scheduledAt.setUTCDate(scheduledAt.getUTCDate() + 1);
      scheduledAt.setUTCHours(9, 0, 0, 0);
    }

    const { error: insertError } = await supabase
      .from("scheduled_posts")
      .insert({
        platform: "x",
        content: generatedText,
        scheduled_at: scheduledAt.toISOString(),
        status: "pending",
        source: "ai_generated",
        category: "quote",
        quote_tweet_id: tweetId,
      });

    if (insertError) {
      console.error("[admin/quote-tweet] Insert failed:", insertError.message);
      return NextResponse.json(
        { error: "Failed to save scheduled post" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      quote_tweet_id: tweetId,
      original_tweet: tweetContent,
      generated_text: generatedText,
      scheduled_at: scheduledAt.toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[admin/quote-tweet] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
