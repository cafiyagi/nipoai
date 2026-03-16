import Link from "next/link";
import {
  MessageSquare,
  Sparkles,
  Clock,
  FileX,
  TrendingDown,
  Check,
  ArrowRight,
  Zap,
  Shield,
  Send,
  ChevronRight,
  Hash,
  Bot,
  BarChart3,
  CalendarRange,
  LayoutDashboard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { FaqItem } from "@/components/ui/faq-item";

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      name: "NipoAI",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      description:
        "Slackの会話からAIが日報を自動生成。毎日15分の作成時間をゼロに。",
      url: "https://nipoai.app",
      offers: [
        {
          "@type": "Offer",
          name: "Free",
          price: "0",
          priceCurrency: "JPY",
          description: "3ユーザーまで、月10件の日報生成",
        },
        {
          "@type": "Offer",
          name: "Standard",
          price: "550",
          priceCurrency: "JPY",
          billingIncrement: "P1M",
          description: "10ユーザーまで、無制限の日報生成",
        },
        {
          "@type": "Offer",
          name: "Team",
          price: "1250",
          priceCurrency: "JPY",
          billingIncrement: "P1M",
          description: "30ユーザーまで、高度なAI分析・チーム分析ダッシュボード",
        },
      ],
    },
  ],
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* ── Header ── */}
      <header className="fixed top-0 z-50 w-full border-b border-gray-100 bg-white/80 backdrop-blur-lg">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:h-16 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white">
              N
            </div>
            <span className="text-lg font-bold text-gray-900">NipoAI</span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">
                ログイン
              </Button>
            </Link>
            <Link href="/signup">
              <Button size="sm">
                無料で始める
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden pt-24 sm:pt-28">
        {/* Background decoration */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 right-0 h-[500px] w-[500px] rounded-full bg-blue-50 opacity-60 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 h-[400px] w-[400px] rounded-full bg-orange-50 opacity-50 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-16 sm:px-6 sm:pb-24 sm:pt-24 lg:pt-28">
          <div className="mx-auto max-w-3xl text-center">
            {/* Badge */}
            <div className="mb-6 inline-flex items-center gap-1.5 rounded-full border border-blue-300 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 sm:text-sm">
              <Sparkles className="h-3.5 w-3.5" />
              無料プランあり
            </div>

            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
              日報を書く時間、
              <br />
              <span className="bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">
                もうゼロにしませんか？
              </span>
            </h1>

            <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-gray-500 sm:mt-6 sm:text-lg">
              Slackの会話からAIが日報を自動生成。
              <br className="hidden sm:block" />
              毎日15分のムダを、ワンクリックに変える。
            </p>

            <p className="mx-auto mt-3 max-w-lg text-sm font-medium text-blue-600/80 sm:text-base">
              Slack AIの要約とは違う。構造化された日報で、チームの可視化を。
            </p>

            <div className="mt-8 flex flex-col items-center gap-3 sm:mt-10 sm:flex-row sm:justify-center sm:gap-4">
              <Link href="/signup" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto">
                  無料で始める
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>

            {/* Social proof badges */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-gray-500 sm:text-sm">
              <span className="flex items-center gap-1">
                <Shield className="h-3.5 w-3.5 text-blue-500" />
                AES-256-GCM暗号化
              </span>
              <span className="flex items-center gap-1">
                <Zap className="h-3.5 w-3.5 text-blue-500" />
                1分でSlack連携
              </span>
              <span className="flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5 text-blue-500" />
                クレジットカード不要で開始
              </span>
            </div>
          </div>

          {/* ── Hero Visual: Slack -> AI -> Report mock ── */}
          <div className="mx-auto mt-14 max-w-4xl sm:mt-20">
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl shadow-gray-200/50">
              {/* Browser chrome */}
              <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50 px-4 py-2.5">
                <div className="h-2.5 w-2.5 rounded-full bg-gray-300" />
                <div className="h-2.5 w-2.5 rounded-full bg-gray-300" />
                <div className="h-2.5 w-2.5 rounded-full bg-gray-300" />
                <div className="ml-3 flex-1 rounded-md bg-gray-200/60 px-3 py-1 text-center text-xs text-gray-400">
                  nipoai.app/dashboard
                </div>
              </div>

              {/* Mock dashboard content */}
              <div className="grid grid-cols-1 gap-0 sm:grid-cols-3">
                {/* Slack messages panel */}
                <div className="border-b border-gray-100 p-4 sm:border-b-0 sm:border-r sm:p-5">
                  <div className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    <Hash className="h-3.5 w-3.5" />
                    Slackメッセージ
                  </div>
                  <div className="space-y-2.5">
                    <MockMessage name="田中" text="APIの修正完了しました" time="10:23" />
                    <MockMessage name="佐藤" text="レビューお願いします" time="11:05" />
                    <MockMessage name="田中" text="デプロイ完了です" time="15:30" />
                  </div>
                </div>

                {/* AI processing */}
                <div className="flex flex-col items-center justify-center border-b border-gray-100 px-4 py-6 sm:border-b-0 sm:border-r sm:py-0">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                    <Bot className="h-5 w-5 text-blue-600" />
                  </div>
                  <p className="mt-2 text-xs font-medium text-blue-600">AI分析中...</p>
                  <div className="mt-2 flex gap-1">
                    <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-400" />
                    <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-400 [animation-delay:150ms]" />
                    <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-400 [animation-delay:300ms]" />
                  </div>
                </div>

                {/* Generated report */}
                <div className="p-4 sm:p-5">
                  <div className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    <Sparkles className="h-3.5 w-3.5" />
                    生成された日報
                  </div>
                  <div className="space-y-2 text-xs leading-relaxed text-gray-600">
                    <p className="font-medium text-gray-800">2026/03/12 日報</p>
                    <p>- API修正・コードレビュー対応</p>
                    <p>- 本番環境へのデプロイ完了</p>
                    <p>- 明日: E2Eテスト実施予定</p>
                  </div>
                  <div className="mt-3">
                    <div className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-[10px] font-medium text-emerald-600">
                      <Check className="h-3 w-3" />
                      提出準備完了
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Pain Points ── */}
      <section className="border-t border-gray-100 bg-gray-50/70">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold text-red-500 uppercase tracking-wider">課題</p>
            <h2 className="mt-2 text-2xl font-bold text-gray-900 sm:text-3xl">
              日報、こんな状態になっていませんか？
            </h2>
          </div>

          <div className="mx-auto mt-10 grid max-w-4xl gap-6 sm:mt-14 sm:grid-cols-3 sm:gap-8">
            {[
              {
                icon: Clock,
                title: "毎日15分、年間100時間",
                description:
                  "書く内容を思い出し、文章を整え、提出する。その時間、本来の仕事に使えたら？",
                color: "red" as const,
              },
              {
                icon: FileX,
                title: "コピペ定型文の山",
                description:
                  "「進捗通りです」「特になし」の日報が並ぶ。書く側も読む側も価値を感じない。",
                color: "red" as const,
              },
              {
                icon: TrendingDown,
                title: "提出率がどんどん低下",
                description:
                  "忙しい日は後回し。未提出が常態化して、チームの状況把握が困難に。",
                color: "red" as const,
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50">
                    <Icon className="h-5 w-5 text-red-500" />
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-gray-900">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-500">
                    {item.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── How It Works (3 Steps) ── */}
      <section className="border-t border-gray-100">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold text-blue-600 uppercase tracking-wider">使い方</p>
            <h2 className="mt-2 text-2xl font-bold text-gray-900 sm:text-3xl">
              3ステップで日報が完成
            </h2>
            <p className="mt-3 text-gray-500">
              セットアップ1分。あとはAIにおまかせ。
            </p>
          </div>

          <div className="mx-auto mt-10 max-w-4xl sm:mt-16">
            <div className="grid gap-8 sm:grid-cols-3">
              {[
                {
                  step: "01",
                  icon: MessageSquare,
                  title: "Slack連携",
                  description:
                    "OAuthで1分セットアップ。対象チャンネルを選ぶだけ。既存のワークフローを変える必要なし。",
                },
                {
                  step: "02",
                  icon: Sparkles,
                  title: "AI自動生成",
                  description:
                    "Slackの会話をAIが分析。やったこと・進捗・課題を整理して日報を自動作成。",
                },
                {
                  step: "03",
                  icon: Send,
                  title: "確認して完了",
                  description:
                    "生成された日報を確認し、必要なら編集。ワンクリックで提出完了。",
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.step} className="relative text-center sm:text-left">
                    <div className="mb-4 flex justify-center sm:justify-start">
                      <div className="relative">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 shadow-lg shadow-blue-600/20">
                          <Icon className="h-5 w-5 text-white" />
                        </div>
                        <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-orange-500 text-[10px] font-bold text-white">
                          {item.step}
                        </span>
                      </div>
                    </div>
                    <h3 className="text-base font-semibold text-gray-900">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-gray-500">
                      {item.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ── Benefits / Value Props ── */}
      <section className="border-t border-gray-100 bg-gray-50/70">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold text-blue-600 uppercase tracking-wider">メリット</p>
            <h2 className="mt-2 text-2xl font-bold text-gray-900 sm:text-3xl">
              チームの生産性を上げる、3つの理由
            </h2>
          </div>

          <div className="mx-auto mt-10 grid max-w-5xl gap-6 sm:mt-14 sm:grid-cols-3 sm:gap-8">
            {[
              {
                icon: Zap,
                title: "年間100時間の削減",
                description:
                  "日報を書く15分/日をほぼゼロに。チーム10名なら年間1,000時間を本来の業務に。",
                stat: "15分 → 0分",
              },
              {
                icon: TrendingDown,
                title: "提出率100%を実現",
                description:
                  "AIが自動生成するからメンバーの負担ゼロ。未提出がなくなり、チーム状況が完全に可視化。",
                stat: "提出率 100%",
              },
              {
                icon: Shield,
                title: "内容の質が向上",
                description:
                  "実際のSlack会話ベースだから具体的。コピペ定型文ではなく、実態に即した日報に。",
                stat: "具体的な内容",
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                    <Icon className="h-5 w-5 text-blue-600" />
                  </div>
                  <p className="mt-4 text-xl font-bold text-blue-600">
                    {item.stat}
                  </p>
                  <h3 className="mt-1 text-base font-semibold text-gray-900">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-500">
                    {item.description}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Accumulated data value */}
          <div className="mx-auto mt-10 max-w-5xl rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50/80 to-indigo-50/60 p-6 sm:mt-14 sm:p-8">
            <div className="text-center">
              <p className="text-sm font-semibold text-indigo-600 uppercase tracking-wider">
                蓄積データの価値
              </p>
              <h3 className="mt-2 text-lg font-bold text-gray-900 sm:text-xl">
                日報は「書く」から「活用する」時代へ
              </h3>
              <p className="mx-auto mt-2 max-w-2xl text-sm text-gray-500">
                日々の日報データが蓄積されることで、チームの動きを数字で把握できるようになります。
              </p>
            </div>
            <div className="mt-8 grid gap-6 sm:grid-cols-3">
              {[
                {
                  icon: CalendarRange,
                  title: "週報・月報の自動集約",
                  description:
                    "日報データを自動で週報・月報にまとめて出力。報告書作成の手間がなくなります。",
                },
                {
                  icon: BarChart3,
                  title: "チーム稼働状況の可視化",
                  description:
                    "メンバーごとの業務量・進捗をリアルタイムで把握。偏りや遅延を早期に発見。",
                },
                {
                  icon: LayoutDashboard,
                  title: "マネジメントダッシュボード",
                  description:
                    "チーム全体の健康状態を一目で確認。課題の傾向やボトルネックを可視化します。",
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className="text-center sm:text-left">
                    <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-sm sm:mx-0">
                      <Icon className="h-5 w-5 text-indigo-600" />
                    </div>
                    <h4 className="mt-3 text-sm font-semibold text-gray-900">
                      {item.title}
                    </h4>
                    <p className="mt-1 text-sm leading-relaxed text-gray-500">
                      {item.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section className="border-t border-gray-100" id="pricing">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold text-blue-600 uppercase tracking-wider">料金</p>
            <h2 className="mt-2 text-2xl font-bold text-gray-900 sm:text-3xl">
              シンプルな料金、隠しコストなし
            </h2>
            <p className="mt-3 text-gray-500">
              ワークスペース単位の課金。いつでもプラン変更・キャンセル可能。
            </p>
          </div>

          <div className="mx-auto mt-10 grid max-w-4xl gap-6 sm:mt-14 sm:grid-cols-3 sm:gap-0">
            {/* Free */}
            <PricingCard
              name="Free"
              price="¥0"
              period="永久無料"
              description="まずは個人で試したい方に"
              features={[
                "3ユーザーまで",
                "月10件の日報生成",
                "Slack 1チャンネル連携",
                "基本テンプレート",
              ]}
              cta="無料で始める"
              highlighted={false}
            />

            {/* Standard */}
            <PricingCard
              name="Standard"
              price="¥550"
              period="月額・税込"
              description="小規模チームでの本格利用に"
              features={[
                "10ユーザーまで",
                "無制限の日報生成",
                "Slack 複数チャンネル連携",
                "カスタムテンプレート",
                "CSV / PDFエクスポート",
                "メール通知",
              ]}
              cta="Standardを始める"
              highlighted={true}
            />

            {/* Team */}
            <PricingCard
              name="Team"
              price="¥1,250"
              period="月額・税込"
              description="組織全体での利用に"
              features={[
                "30ユーザーまで",
                "無制限の日報生成",
                "ワークスペース全体連携",
                "高度なAI分析・要約",
                "チーム分析ダッシュボード",
                "API連携",
                "優先サポート",
              ]}
              cta="Teamを始める"
              highlighted={false}
            />
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="border-t border-gray-100 bg-gray-50/70" id="faq">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold text-blue-600 uppercase tracking-wider">FAQ</p>
            <h2 className="mt-2 text-2xl font-bold text-gray-900 sm:text-3xl">
              よくある質問
            </h2>
          </div>

          <div className="mx-auto mt-10 max-w-3xl divide-y divide-gray-200 sm:mt-14">
            <FaqItem
              question="NipoAIとは何ですか？"
              answer="Slackの会話履歴からAIが日報を自動生成するサービスです。毎日Slackで交わされるメッセージを分析し、チームメンバーごとの日報を自動作成します。"
            />
            <FaqItem
              question="Slack AIの要約機能とは何が違いますか？"
              answer="Slack AIはチャンネルの会話を要約するだけですが、NipoAIは「日報」として構造化された形式で出力します。業務内容・課題・翌日の予定などを自動分類し、蓄積・分析・チーム管理ができます。"
            />
            <FaqItem
              question="Slackのデータは安全ですか？"
              answer="はい。Slackの認証トークンはAES-256-GCM方式で暗号化して保管しています。メッセージデータは日報生成後に保持せず、通信は全てHTTPSで暗号化されています。"
            />
            <FaqItem
              question="無料プランでどこまで使えますか？"
              answer="3名までのチームで月10件の日報生成が可能です。基本的な機能は全て使えるので、まずは無料でお試しください。"
            />
            <FaqItem
              question="導入にどれくらい時間がかかりますか？"
              answer="Slack連携は1分で完了します。アカウント作成→Slack連携→チャンネル選択の3ステップで、すぐに日報の自動生成を開始できます。"
            />
            <FaqItem
              question="チームの一部だけで試せますか？"
              answer="はい。特定のSlackチャンネルだけを選択して連携できるので、チームの一部から始めて、効果を確認してから全体に展開できます。"
            />
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="border-t border-gray-100 bg-blue-600">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold text-white sm:text-3xl">
              日報作成の手間、今日からゼロにしませんか？
            </h2>
            <p className="mt-3 text-blue-100">
              無料プランで今すぐスタート。クレジットカード不要。
            </p>
            <div className="mt-8">
              <Link href="/signup">
                <Button
                  size="lg"
                  className="bg-white text-blue-600 hover:bg-blue-50 focus-visible:ring-white"
                >
                  無料で始める
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
            <p className="mt-2 text-xs text-blue-200">
              クレジットカード不要 / セットアップ1分 / いつでもキャンセル可能
            </p>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-gray-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-xs font-bold text-white">
                N
              </div>
              <span className="font-semibold text-gray-900">NipoAI</span>
            </Link>
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-gray-500">
              <Link href="/terms" className="transition-colors hover:text-gray-900">
                利用規約
              </Link>
              <Link href="/privacy" className="transition-colors hover:text-gray-900">
                プライバシーポリシー
              </Link>
              <Link href="/legal" className="transition-colors hover:text-gray-900">
                特定商取引法に基づく表記
              </Link>
              <Link href="/contact" className="transition-colors hover:text-gray-900">
                お問い合わせ
              </Link>
            </div>
            <p className="text-xs text-gray-400">
              &copy; 2026 NipoAI. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ── Sub-components ── */

function MockMessage({
  name,
  text,
  time,
}: {
  name: string;
  text: string;
  time: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-gray-200 text-[10px] font-bold text-gray-500">
        {name[0]}
      </div>
      <div className="min-w-0">
        <div className="flex items-baseline gap-1.5">
          <span className="text-xs font-medium text-gray-700">{name}</span>
          <span className="text-[10px] text-gray-300">{time}</span>
        </div>
        <p className="text-xs text-gray-500">{text}</p>
      </div>
    </div>
  );
}

function PricingCard({
  name,
  price,
  period,
  description,
  features,
  cta,
  highlighted,
}: {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  cta: string;
  highlighted: boolean;
}) {
  return (
    <div
      className={
        highlighted
          ? "relative z-10 rounded-xl border-2 border-blue-600 bg-white p-6 shadow-xl shadow-blue-600/10 sm:-my-4 sm:p-8"
          : "rounded-xl border border-gray-200 bg-white p-6 sm:p-8 sm:first:rounded-r-none sm:last:rounded-l-none"
      }
    >
      {highlighted && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-orange-500 px-3 py-0.5 text-xs font-semibold text-white">
          おすすめ
        </div>
      )}
      <p className="text-sm font-semibold text-gray-900">{name}</p>
      <div className="mt-3 flex items-baseline gap-1">
        <span className="text-3xl font-extrabold text-gray-900">{price}</span>
        <span className="text-sm text-gray-400">/ {period}</span>
      </div>
      <p className="mt-1 text-sm text-gray-500">{description}</p>
      <hr className="my-5 border-gray-100" />
      <ul className="flex flex-col gap-2.5">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
            {f}
          </li>
        ))}
      </ul>
      <div className="mt-6">
        <Link href="/signup">
          <Button
            variant={highlighted ? "default" : "outline"}
            className="w-full"
          >
            {cta}
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
