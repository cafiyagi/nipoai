# NipoAI Launch Thread + Build in Public Tweets

---

## Launch Thread (7 tweets)

### Tweet 1/7 -- Hook

日報、書くのだるくないですか？

毎日15分。年間100時間。
しかも誰も読まない。

「今日やったこと」なんてSlackに全部書いてあるのに、
わざわざ別のフォーマットに書き直す意味ある？

ないよ。

だから作った。
Slackの会話からAIが日報を自動生成するSaaS。

NipoAI、今日ローンチします。

https://nipoai.app

1/7

---

### Tweet 2/7 -- Why I built this

なぜ作ったか。

前職で毎日日報を書いてた。
夕方になると「あれ今日何やったっけ」ってSlackを遡る作業が始まる。

それ、AIがやればよくない？

Slackに業務の全てが記録されてるのに、
人間がわざわざ要約して別の場所に書くのは無駄すぎる。

個人開発者として、自分が欲しいものを作った。
NipoAIはその答え。

2/7

---

### Tweet 3/7 -- How it works (3 steps)

使い方は3ステップ。

Step 1: Slack連携（OAuthで1分）
Step 2: 対象チャンネルを選ぶ
Step 3: AIが毎日メッセージを分析して日報を自動生成

あとは内容を確認して「提出」ボタンを押すだけ。

日報を「書く作業」から「確認する作業」に変える。

毎日15分が1分になる。

3/7

---

### Tweet 4/7 -- vs Slack AI summary

「Slack AIのサマリーでよくない？」

違います。

Slack AIのサマリー:
- チャンネルの会話をそのまま要約するだけ
- 日報フォーマットじゃない
- チーム全員分を横断的に見れない
- 提出・管理の仕組みがない

NipoAI:
- 個人単位で「その人が何をしたか」を抽出
- 日報テンプレートに沿って構造化
- 確認 → 編集 → 提出のワークフロー付き
- チーム全体の提出状況を管理者が一覧で確認

要約と日報は別物。

4/7

---

### Tweet 5/7 -- Tech stack / dev story

技術スタック:
- Next.js + TypeScript
- Supabase (Auth + DB)
- OpenAI GPT-4o mini
- Vercel
- Stripe

1人で作った。
企画からデザイン、実装、課金、本番デプロイまで全部。

Slackトークンは AES-256-GCM で暗号化。
メッセージは日報生成後に保持しない。

「日報SaaS」だからこそ、セキュリティは妥協しなかった。

5/7

---

### Tweet 6/7 -- Pricing

料金:
- Free: 無料（3名まで、月30回生成）
- Standard: 月額 ¥550（10名まで）
- Team: 月額 ¥1,250（30名まで）

クレジットカード不要で始められます。
無料プランだけでも十分使える設計。

フィードバックも大歓迎。
一緒にプロダクトを磨きたい。

6/7

---

### Tweet 7/7 -- CTA

日報を書く時間を、もっと意味のある仕事に使おう。

NipoAI
https://nipoai.app

Slack連携1分で始められます。
無料プランで今すぐスタート。

気になったらまずサイト見てみてください。
DMでの質問も歓迎です。

開発の裏側はこのアカウントで発信していきます。
フォローしてもらえると嬉しい。

#NipoAI #BuildInPublic #個人開発 #SaaS #日報

7/7

---
---

## Build in Public -- Week 1 standalone tweets (5 ideas)

### Standalone 1: Before/After

日報のBefore/After

Before:
- 夕方に15分かけてSlack遡る
- 「今日何やったっけ...」
- 結局コピペで形骸化
- 提出率60%

After (NipoAI):
- AIが自動生成
- 確認して提出ボタン押すだけ
- 1分で完了
- 提出率100%

https://nipoai.app

#NipoAI #個人開発

---

### Standalone 2: Revenue / Cost transparency

NipoAIの原価、公開します。

- Vercel: $0（Hobby）
- Supabase: $0（Free tier）
- OpenAI API: 約¥3.6/ユーザー/月
- ドメイン: 約¥1,500/年

月の固定費、ほぼ¥0。
有料ユーザー10社で黒字化できる設計。

個人開発SaaSはコスト構造が全て。

#BuildInPublic #個人開発 #SaaS

---

### Standalone 3: Development timeline

NipoAIの開発タイムライン:

Day 1-2: 企画・設計
Day 3-5: 認証・DB・基盤
Day 6-8: Slack OAuth連携
Day 9-10: AI日報生成エンジン
Day 11-12: ダッシュボード UI
Day 13: Stripe課金実装
Day 14: 本番デプロイ

2週間でアイデアからローンチまで。
完璧を目指さない。まず出す。

#BuildInPublic #個人開発

---

### Standalone 4: Security design decisions

「Slackのメッセージ預けるの怖くない？」

NipoAIのセキュリティ設計:

1. SlackトークンはAES-256-GCMで暗号化してDBに保存
2. メッセージは日報生成時にのみ取得、保持しない
3. Supabase RLSで全テーブルにRow Level Security
4. OAuth scopeは必要最小限のread-only

日報SaaSだからこそ、信頼が全て。
ここは手を抜かなかった。

#NipoAI #セキュリティ

---

### Standalone 5: Target user pain point

マネージャーの皆さんに聞きたい。

チームの日報提出率、何%ですか？

「忙しくて書けませんでした」
「明日まとめて出します」
「すみません忘れてました」

これ、メンバーのせいじゃない。
日報を書く仕組みが時代に合ってないだけ。

Slackで仕事してるなら、日報もSlackから作ればいい。

https://nipoai.app

#NipoAI #日報

---

## 投稿スケジュール案

| 日付 | 投稿内容 |
|---|---|
| Day 1 (ローンチ日) | Launch Thread (7 tweets) |
| Day 2 | Standalone 1: Before/After |
| Day 3 | Standalone 2: Revenue/Cost transparency |
| Day 4 | Standalone 3: Development timeline |
| Day 5 | Standalone 4: Security design |
| Day 6 | Standalone 5: Target user pain point |
| Day 7 | 初週の反応まとめ + 学び |

**投稿時間の推奨**: 平日 8:00-9:00 or 12:00-13:00 (昼休み) or 18:00-19:00
