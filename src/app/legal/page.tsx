import Link from "next/link";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "特定商取引法に基づく表記 | NipoAI",
  description:
    "NipoAIの特定商取引法に基づく表記ページです。販売価格、支払方法、返品・キャンセルポリシーなどをご確認いただけます。",
};

export default function LegalPage() {
  return (
    <div className="min-h-screen bg-white">
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
              <Button size="sm">無料で始める</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* ── Content ── */}
      <main className="mx-auto max-w-3xl px-4 pb-20 pt-28 sm:px-6 sm:pt-32">
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
          特定商取引法に基づく表記
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          特定商取引法第11条に基づく通信販売についての表示事項
        </p>

        <div className="mt-10 divide-y divide-gray-100">
          <LegalRow label="販売業者" value="個人事業主（※）" />
          <LegalRow label="運営統括責任者" value="※ 請求があった場合に遅滞なく開示いたします" />
          <LegalRow label="所在地" value="※ 請求があった場合に遅滞なく開示いたします" />
          <LegalRow label="電話番号" value="※ 請求があった場合に遅滞なく開示いたします" />
          <LegalRow label="メールアドレス" value="nipoaisupport@gmail.com" />
          <LegalRow label="URL" value="https://nipoai.app" isLink />

          <div className="py-5 sm:grid sm:grid-cols-3 sm:gap-4">
            <dt className="text-sm font-medium text-gray-900">販売価格</dt>
            <dd className="mt-1 text-sm text-gray-600 sm:col-span-2 sm:mt-0">
              <ul className="space-y-1">
                <li>Free プラン: 0円（永久無料）</li>
                <li>Starter プラン: 550円/月（税込）</li>
                <li>Team プラン: 1,250円/月（税込）</li>
              </ul>
              <p className="mt-2 text-xs text-gray-400">
                ※ 上記は全て税込価格です。別途費用は発生しません。
              </p>
            </dd>
          </div>

          <LegalRow
            label="支払方法"
            value="クレジットカード（Visa、Mastercard、American Express、JCB）※ Stripe経由での決済"
          />
          <LegalRow
            label="支払時期"
            value="有料プランへの申込時にクレジットカードへ課金されます。以降、毎月同日に自動更新・課金されます。"
          />
          <LegalRow
            label="決済通貨"
            value="日本円（JPY）"
          />
          <LegalRow
            label="サービス提供時期"
            value="決済完了後、直ちにサービスをご利用いただけます。"
          />

          <div className="py-5 sm:grid sm:grid-cols-3 sm:gap-4">
            <dt className="text-sm font-medium text-gray-900">
              返品・キャンセルについて
            </dt>
            <dd className="mt-1 text-sm text-gray-600 sm:col-span-2 sm:mt-0">
              <ul className="list-disc space-y-1 pl-4">
                <li>
                  デジタルサービスの性質上、お支払い後の返金には対応しておりません。
                </li>
                <li>
                  有料プランの解約はいつでも可能です。解約後も、当月の残りの期間は引き続きサービスをご利用いただけます。
                </li>
                <li>
                  解約手続きはアカウント設定画面から行えます。
                </li>
                <li>
                  Freeプランは無料でご利用いただけます。有料プランへの切り替え前にFreeプランで機能をお試しいただけます。
                </li>
              </ul>
            </dd>
          </div>

          <div className="py-5 sm:grid sm:grid-cols-3 sm:gap-4">
            <dt className="text-sm font-medium text-gray-900">動作環境</dt>
            <dd className="mt-1 text-sm text-gray-600 sm:col-span-2 sm:mt-0">
              <ul className="list-disc space-y-1 pl-4">
                <li>
                  対応ブラウザ: Google Chrome、Safari、Firefox、Microsoft
                  Edge（いずれも最新版を推奨）
                </li>
                <li>インターネット接続が必要です</li>
                <li>Slackワークスペースとの連携が必要です</li>
              </ul>
            </dd>
          </div>
        </div>

        <div className="mt-8 rounded-lg border border-gray-100 bg-gray-50 p-4">
          <p className="text-xs leading-relaxed text-gray-500">
            ※
            「特定商取引に関する法律」第11条に基づき、販売業者の氏名（名称）、住所および電話番号については、請求があった場合に遅滞なく提供いたします。開示をご希望の方は、上記メールアドレスまでご連絡ください。
          </p>
        </div>

        <div className="mt-10 text-center">
          <Link href="/contact">
            <Button variant="outline">
              お問い合わせはこちら
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </main>

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
              <Link href="#" className="transition-colors hover:text-gray-900">
                利用規約
              </Link>
              <Link href="#" className="transition-colors hover:text-gray-900">
                プライバシーポリシー
              </Link>
              <Link
                href="/legal"
                className="transition-colors hover:text-gray-900"
              >
                特定商取引法に基づく表記
              </Link>
              <Link
                href="/contact"
                className="transition-colors hover:text-gray-900"
              >
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

function LegalRow({
  label,
  value,
  isLink,
}: {
  label: string;
  value: string;
  isLink?: boolean;
}) {
  return (
    <div className="py-5 sm:grid sm:grid-cols-3 sm:gap-4">
      <dt className="text-sm font-medium text-gray-900">{label}</dt>
      <dd className="mt-1 text-sm text-gray-600 sm:col-span-2 sm:mt-0">
        {isLink ? (
          <a
            href={value}
            className="text-blue-600 underline underline-offset-2 hover:text-blue-700"
            target="_blank"
            rel="noopener noreferrer"
          >
            {value}
          </a>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}
