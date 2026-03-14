/**
 * Seed scheduled tweets from content/launch-tweets.md
 * Usage: npx tsx scripts/seed-tweets.ts
 *
 * Requires env vars: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { join } from "path";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

// Build in Public standalone tweets (Week 1, Day 2-6)
// Launch thread was already posted manually
const tweetsFile = readFileSync(
  join(__dirname, "../content/launch-tweets.md"),
  "utf-8",
);

// Extract standalone tweets
const standaloneSection = tweetsFile.split("## Build in Public -- Week 1 standalone tweets")[1];
if (!standaloneSection) {
  console.error("Could not find standalone tweets section");
  process.exit(1);
}

const tweetBlocks = standaloneSection.split("### Standalone ").slice(1);

const tweets: { content: string; dayOffset: number }[] = [];

for (const block of tweetBlocks) {
  const lines = block.split("\n");
  // Skip the title line and the --- separator
  const titleLine = lines[0]; // e.g. "1: Before/After"
  const dayMatch = titleLine?.match(/^(\d+)/);
  if (!dayMatch) continue;

  const dayOffset = parseInt(dayMatch[1]); // 1-5

  // Extract tweet content (between first --- and last --- or ## or end)
  const contentStart = block.indexOf("\n\n") + 2;
  let content = block.slice(contentStart);

  // Remove trailing --- and schedule section
  const endMarker = content.indexOf("\n---");
  if (endMarker !== -1) {
    content = content.slice(0, endMarker);
  }

  // Remove ## sections
  const sectionMarker = content.indexOf("\n## ");
  if (sectionMarker !== -1) {
    content = content.slice(0, sectionMarker);
  }

  content = content.trim();
  if (content) {
    tweets.push({ content, dayOffset });
  }
}

async function seed() {
  // Schedule starting from tomorrow at 18:00 JST (09:00 UTC)
  const baseDate = new Date();
  baseDate.setUTCHours(9, 0, 0, 0);
  // If it's already past 09:00 UTC today, start from tomorrow
  if (new Date() > baseDate) {
    baseDate.setUTCDate(baseDate.getUTCDate() + 1);
  }

  const rows = tweets.map((t, i) => {
    const scheduledAt = new Date(baseDate);
    scheduledAt.setUTCDate(scheduledAt.getUTCDate() + i);
    return {
      platform: "x" as const,
      content: t.content,
      scheduled_at: scheduledAt.toISOString(),
      status: "pending" as const,
    };
  });

  console.log(`Seeding ${rows.length} tweets:`);
  for (const row of rows) {
    console.log(`  ${row.scheduled_at}: ${row.content.slice(0, 60)}...`);
  }

  const { error } = await supabase.from("scheduled_posts").insert(rows);
  if (error) {
    console.error("Failed to seed:", error);
    process.exit(1);
  }

  console.log("Done!");
}

seed();
