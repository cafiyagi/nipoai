import { createClient } from "@supabase/supabase-js";
import { generateBuzzTweet } from "./generate-buzz-tweet";

export interface BuzzArticle {
  title: string;
  url: string;
  bookmarkCount: number;
  description: string;
  date: string;
}

const RSS_URLS = [
  "https://b.hatena.ne.jp/search/text?q=日報&sort=recent&users=30&mode=rss",
  "https://b.hatena.ne.jp/search/text?q=日報+AI&sort=recent&users=10&mode=rss",
  "https://b.hatena.ne.jp/search/text?q=リモートワーク+日報&sort=recent&users=10&mode=rss",
  "https://b.hatena.ne.jp/search/text?q=Slack+業務効率化&sort=recent&users=20&mode=rss",
  "https://b.hatena.ne.jp/search/text?q=日報+自動化&sort=recent&users=5&mode=rss",
  "https://b.hatena.ne.jp/search/text?q=チーム+可視化&sort=recent&users=10&mode=rss",
  "https://b.hatena.ne.jp/search/text?q=リモートワーク+生産性&sort=recent&users=20&mode=rss",
  "https://b.hatena.ne.jp/search/text?q=Slack+AI&sort=recent&users=10&mode=rss",
];

const MIN_BOOKMARKS = 50;
const MAX_ARTICLES = 5;
const MAX_BUZZ_TWEETS_PER_RUN = 2;

function parseItems(xml: string): BuzzArticle[] {
  const items: BuzzArticle[] = [];
  const itemRegex = /<item[\s>][\s\S]*?<\/item>/g;
  let match: RegExpExecArray | null;

  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[0];

    const titleMatch = block.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/);
    const linkMatch = block.match(/<link>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/);
    const descMatch = block.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/);
    const dateMatch = block.match(/<dc:date>([\s\S]*?)<\/dc:date>/);
    const countMatch = block.match(/<hatena:bookmarkcount>(\d+)<\/hatena:bookmarkcount>/);

    const title = titleMatch?.[1]?.trim() ?? "";
    const url = linkMatch?.[1]?.trim() ?? "";
    const description = descMatch?.[1]?.trim() ?? "";
    const date = dateMatch?.[1]?.trim() ?? "";
    const bookmarkCount = countMatch ? parseInt(countMatch[1], 10) : 0;

    if (url) {
      items.push({ title, url, bookmarkCount, description, date });
    }
  }

  return items;
}

export async function detectBuzzArticles(): Promise<BuzzArticle[]> {
  const allArticles: BuzzArticle[] = [];
  const seenUrls = new Set<string>();

  const results = await Promise.allSettled(
    RSS_URLS.map(async (rssUrl) => {
      const res = await fetch(rssUrl, {
        headers: { "User-Agent": "NipoAI-BuzzDetector/1.0" },
      });
      if (!res.ok) {
        console.warn(`[detect-buzz] RSS fetch failed (${res.status}): ${rssUrl}`);
        return [];
      }
      const xml = await res.text();
      return parseItems(xml);
    }),
  );

  for (const result of results) {
    if (result.status === "fulfilled") {
      for (const article of result.value) {
        if (article.bookmarkCount >= MIN_BOOKMARKS && !seenUrls.has(article.url)) {
          seenUrls.add(article.url);
          allArticles.push(article);
        }
      }
    }
  }

  // Sort by bookmark count descending, take top N
  allArticles.sort((a, b) => b.bookmarkCount - a.bookmarkCount);
  return allArticles.slice(0, MAX_ARTICLES);
}

export interface BuzzTweetResult {
  detected: number;
  newArticles: number;
  tweetsQueued: number;
}

export async function detectAndQueueBuzzTweets(): Promise<BuzzTweetResult> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // 1. Detect buzz articles
  const articles = await detectBuzzArticles();
  console.log(`[detect-buzz] Found ${articles.length} buzz articles (>=${MIN_BOOKMARKS} bookmarks)`);

  if (articles.length === 0) {
    return { detected: 0, newArticles: 0, tweetsQueued: 0 };
  }

  // 2. Check which URLs are already in buzz_articles
  const urls = articles.map((a) => a.url);
  const { data: existingRows } = await supabase
    .from("buzz_articles")
    .select("url")
    .in("url", urls);

  const existingUrls = new Set((existingRows ?? []).map((r) => r.url));
  const newArticles = articles.filter((a) => !existingUrls.has(a.url));

  console.log(`[detect-buzz] ${newArticles.length} new articles after dedup`);

  if (newArticles.length === 0) {
    return { detected: articles.length, newArticles: 0, tweetsQueued: 0 };
  }

  // 3. Find last pending post's scheduled_at for scheduling
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
    nextDate = new Date();
    nextDate.setUTCDate(nextDate.getUTCDate() + 1);
    nextDate.setUTCHours(9, 0, 0, 0);
  }

  // 4. Generate tweets for new articles (max 2 per run)
  let tweetsQueued = 0;
  const toProcess = newArticles.slice(0, MAX_BUZZ_TWEETS_PER_RUN);

  for (const article of toProcess) {
    try {
      const tweet = await generateBuzzTweet(article);

      // Insert into buzz_articles for dedup
      const { error: buzzInsertError } = await supabase
        .from("buzz_articles")
        .insert({
          url: article.url,
          title: article.title,
          bookmark_count: article.bookmarkCount,
          tweet_generated: true,
        });

      if (buzzInsertError) {
        // Likely a unique constraint violation (race condition)
        console.warn(`[detect-buzz] buzz_articles insert failed: ${buzzInsertError.message}`);
        continue;
      }

      // Insert into scheduled_posts
      const { error: postInsertError } = await supabase
        .from("scheduled_posts")
        .insert({
          platform: "x",
          content: tweet,
          scheduled_at: nextDate.toISOString(),
          status: "pending",
          source: "ai_generated",
          category: "buzz",
        });

      if (postInsertError) {
        console.error(`[detect-buzz] scheduled_posts insert failed: ${postInsertError.message}`);
        continue;
      }

      tweetsQueued++;
      nextDate.setUTCDate(nextDate.getUTCDate() + 1);

      console.log(
        `[detect-buzz] Queued buzz tweet for "${article.title.slice(0, 40)}..." (${article.bookmarkCount} bookmarks)`,
      );
    } catch (err) {
      console.error(
        `[detect-buzz] Failed to generate tweet for "${article.title}":`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  // 5. Also record remaining new articles (without tweet) for future reference
  const remaining = newArticles.slice(MAX_BUZZ_TWEETS_PER_RUN);
  if (remaining.length > 0) {
    const rows = remaining.map((a) => ({
      url: a.url,
      title: a.title,
      bookmark_count: a.bookmarkCount,
      tweet_generated: false,
    }));

    const { error } = await supabase.from("buzz_articles").upsert(rows, {
      onConflict: "url",
      ignoreDuplicates: true,
    });

    if (error) {
      console.warn(`[detect-buzz] Failed to record remaining articles: ${error.message}`);
    }
  }

  console.log(
    `[detect-buzz] Done: ${articles.length} detected, ${newArticles.length} new, ${tweetsQueued} queued`,
  );

  return {
    detected: articles.length,
    newArticles: newArticles.length,
    tweetsQueued,
  };
}
