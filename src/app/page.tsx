import Link from "next/link";
import {
  MessageSquare,
  Sparkles,
  Users,
  Clock,
  FileX,
  TrendingDown,
  Check,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

const problems = [
  {
    icon: Clock,
    title: "書くのに時間がかかる",
    description: "毎日10〜30分、年間で約100時間を日報に費やしていませんか？",
  },
  {
    icon: FileX,
    title: "形式的で読む価値がない",
    description:
      "コピペや定型文ばかり。読む側も書く側もモチベーションが下がります。",
  },
  {
    icon: TrendingDown,
    title: "提出率が低い",
    description:
      "忙しい日は後回し、そのまま未提出。チームの状況が見えなくなります。",
  },
];

const features = [
  {
    icon: MessageSquare,
    title: "Slack連携",
    description:
      "5分でセットアップ完了。普段のSlackチャットから自動でデータ収集。新しいツールを覚える必要はありません。",
  },
  {
    icon: Sparkles,
    title: "AI自動生成",
    description:
      "AIがチャット履歴を分析し、日報を自動生成。書く手間はゼロ。確認して送信するだけ。",
  },
  {
    icon: Users,
    title: "チーム管理",
    description:
      "メンバー全員の日報を一覧で確認。提出率は自然と100%に。マネージャーの負担も軽減。",
  },
];

const plans = [
  {
    name: "Free",
    price: "¥0",
    period: "永久無料",
    description: "個人での利用に",
    features: [
      "1ユーザー",
      "月10件まで日報生成",
      "Slack 1チャンネル連携",
      "基本テンプレート",
    ],
    cta: "無料で始める",
    highlighted: false,
  },
  {
    name: "Starter",
    price: "¥1,980",
    period: "月額・税込",
    description: "チームでの本格利用に",
    features: [
      "5ユーザーまで",
      "無制限の日報生成",
      "Slack 複数チャンネル連携",
      "カスタムテンプレート",
      "CSV/PDFエクスポート",
      "メール通知",
    ],
    cta: "無料トライアル開始",
    highlighted: true,
  },
  {
    name: "Team",
    price: "¥4,980",
    period: "月額・税込",
    description: "組織全体での利用に",
    features: [
      "無制限ユーザー",
      "無制限の日報生成",
      "Slack ワークスペース全体連携",
      "高度なAI分析・要約",
      "チーム分析ダッシュボード",
      "API連携",
      "優先サポート",
    ],
    cta: "無料トライアル開始",
    highlighted: false,
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-100">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white">
              N
            </div>
            <span className="text-lg font-bold text-gray-900">NipoAI</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">
                ログイン
              </Button>
            </Link>
            <Link href="/signup">
              <Button size="sm">無料で始める</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28 lg:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
              日報を書くのではなく、
              <br />
              <span className="text-blue-600">
                日報が勝手にできあがる
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-gray-600">
              Slackのチャット履歴からAIが毎日の日報を自動生成。
              <br className="hidden sm:block" />
              確認して送信ボタンを押すだけ。
            </p>
            <div className="mt-10 flex items-center justify-center gap-4">
              <Link href="/login">
                <Button size="lg">
                  無料で始める
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Demo placeholder */}
          <div className="mx-auto mt-16 max-w-4xl">
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-gray-50 shadow-2xl shadow-blue-600/10">
              <div className="flex items-center gap-2 border-b border-gray-200 bg-white px-4 py-3">
                <div className="h-3 w-3 rounded-full bg-red-400" />
                <div className="h-3 w-3 rounded-full bg-yellow-400" />
                <div className="h-3 w-3 rounded-full bg-green-400" />
                <span className="ml-2 text-sm text-gray-400">
                  NipoAI - ダッシュボード
                </span>
              </div>
              <div className="flex h-64 items-center justify-center sm:h-80">
                <div className="text-center">
                  <Sparkles className="mx-auto h-12 w-12 text-blue-400" />
                  <p className="mt-4 text-sm text-gray-400">
                    デモ画面イメージ
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problems */}
      <section className="border-t border-gray-100 bg-gray-50">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-gray-900">
              日報、こんな悩みありませんか？
            </h2>
          </div>
          <div className="mx-auto mt-12 grid max-w-4xl gap-8 sm:grid-cols-3">
            {problems.map((problem) => {
              const Icon = problem.icon;
              return (
                <div key={problem.title} className="text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-red-100">
                    <Icon className="h-6 w-6 text-red-600" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-gray-900">
                    {problem.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-600">
                    {problem.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-gray-100">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-gray-900">
              NipoAIがすべて解決します
            </h2>
            <p className="mt-4 text-gray-600">
              3つのステップで、日報の悩みから解放されます。
            </p>
          </div>
          <div className="mx-auto mt-12 grid max-w-5xl gap-8 sm:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <Card key={feature.title} className="border-gray-100">
                  <CardHeader>
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                      <Icon className="h-5 w-5 text-blue-600" />
                    </div>
                    <CardTitle className="mt-2">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm leading-relaxed text-gray-600">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="border-t border-gray-100 bg-gray-50">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-gray-900">
              シンプルな料金プラン
            </h2>
            <p className="mt-4 text-gray-600">
              すべてのプランに14日間の無料トライアル付き。
            </p>
          </div>
          <div className="mx-auto mt-12 grid max-w-5xl gap-8 sm:grid-cols-3">
            {plans.map((plan) => (
              <Card
                key={plan.name}
                className={
                  plan.highlighted
                    ? "relative border-blue-600 shadow-lg shadow-blue-600/10"
                    : "border-gray-200"
                }
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-3 py-1 text-xs font-medium text-white">
                    人気
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="text-base">{plan.name}</CardTitle>
                  <div className="mt-2">
                    <span className="text-3xl font-bold text-gray-900">
                      {plan.price}
                    </span>
                    <span className="ml-1 text-sm text-gray-500">
                      / {plan.period}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">{plan.description}</p>
                </CardHeader>
                <CardContent>
                  <ul className="flex flex-col gap-3">
                    {plan.features.map((feature) => (
                      <li
                        key={feature}
                        className="flex items-start gap-2 text-sm text-gray-600"
                      >
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-6">
                    <Link href="/signup">
                      <Button
                        variant={plan.highlighted ? "default" : "outline"}
                        className="w-full"
                      >
                        {plan.cta}
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-xs font-bold text-white">
                N
              </div>
              <span className="font-semibold text-gray-900">NipoAI</span>
            </div>
            <div className="flex gap-6 text-sm text-gray-500">
              <Link href="#" className="transition-colors hover:text-gray-900">
                利用規約
              </Link>
              <Link href="#" className="transition-colors hover:text-gray-900">
                プライバシーポリシー
              </Link>
              <Link href="#" className="transition-colors hover:text-gray-900">
                お問い合わせ
              </Link>
            </div>
            <p className="text-sm text-gray-400">
              &copy; 2026 NipoAI. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
