import OpenAI from "openai";

const MODEL = "gpt-4o-mini";

const SYSTEM_PROMPT = `あなたはNipoAI（Slackの会話からAIが日報を自動生成するSaaS）の個人開発者ryutoです。
バズっているツイートを引用RTして、自分の視点でコメントします。

ルール:
- 140文字以内
- 元ツイートに共感・同意してから自分の体験や意見を加える
- 3回に1回だけNipoAIに自然に触れる（強制しない）
- ハッシュタグ禁止
- URL禁止
- 絵文字禁止
- 宣伝臭を出さない
- 「よかったら使ってください」等のCTA禁止
- 当事者として語る。評論家目線禁止
- 箇条書き禁止`;

export async function generateQuoteTweet(
  tweetUrl: string,
  tweetContent: string,
): Promise<string> {
  const shouldMentionNipoAI = Math.random() < 1 / 3;

  const userPrompt = `以下のツイートを引用RTするコメントを書いて。

元ツイート:
「${tweetContent}」

NipoAIに触れる: ${shouldMentionNipoAI ? "yes" : "no"}`;

  const openai = new OpenAI();

  const response = await openai.chat.completions.create({
    model: MODEL,
    temperature: 1.0,
    max_tokens: 300,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
  });

  const content = response.choices[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("Failed to generate quote tweet: empty response from AI");
  }

  // Strip quotes if GPT wraps the tweet
  const cleaned = content.replace(/^["「『]|["」』]$/g, "");

  if (cleaned.length > 280) {
    throw new Error(
      `Generated quote tweet too long (${cleaned.length} chars)`,
    );
  }

  return cleaned;
}
