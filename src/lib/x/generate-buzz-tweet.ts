import OpenAI from "openai";
import type { BuzzArticle } from "./detect-buzz";

const MODEL = "gpt-4o-mini";

const SYSTEM_PROMPT = `あなたはNipoAI（Slackの会話からAIが日報を自動生成するSaaS）の個人開発者ryutoです。
はてなブックマークでバズっている記事について、X(Twitter)でコメントツイートを書きます。

ルール:
- 200文字以内
- 記事の内容に対する自分の意見・体験を書く
- NipoAIとの関連がある場合のみNipoAIに触れる（無理に触れない）
- 記事URLは含めない（引用元として記事タイトルに言及するだけでOK）
- ハッシュタグ禁止、絵文字禁止
- 宣伝臭を出さない
- 当事者として語る
- 「この記事面白い」等の感想だけは禁止。自分の視点を加える`;

export async function generateBuzzTweet(article: BuzzArticle): Promise<string> {
  const userPrompt = `以下のバズ記事についてコメントツイートを書いて。

タイトル: ${article.title}
内容: ${article.description}
ブクマ数: ${article.bookmarkCount}`;

  const openai = new OpenAI();

  const response = await openai.chat.completions.create({
    model: MODEL,
    temperature: 1.0,
    max_tokens: 400,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
  });

  const content = response.choices[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("Failed to generate buzz tweet: empty response from AI");
  }

  // Strip quotes if GPT wraps the tweet
  const cleaned = content.replace(/^["「『]|["」』]$/g, "");

  if (cleaned.length > 280) {
    throw new Error(`Generated buzz tweet too long (${cleaned.length} chars)`);
  }

  return cleaned;
}
