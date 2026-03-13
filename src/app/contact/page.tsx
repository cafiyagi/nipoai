import Link from "next/link";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Mail, ArrowRight, MessageSquare } from "lucide-react";

export const metadata: Metadata = {
  title: "お問い合わせ | NipoAI",
  description:
    "NipoAIへのお問い合わせページです。サービスに関するご質問やご要望をお寄せください。",
};

export default function ContactPage() {
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
          お問い合わせ
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          NipoAIに関するご質問・ご要望・不具合のご報告など、お気軽にお問い合わせください。
        </p>

        {/* ── Email direct ── */}
        <div className="mt-10 rounded-xl border border-gray-100 bg-gray-50 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
              <Mail className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">
                メールでのお問い合わせ
              </p>
              <a
                href="mailto:nipoaisupport@gmail.com"
                className="text-sm text-blue-600 underline underline-offset-2 hover:text-blue-700"
              >
                nipoaisupport@gmail.com
              </a>
            </div>
          </div>
          <p className="mt-3 text-xs text-gray-500">
            通常、2営業日以内にご返信いたします。
          </p>
        </div>

        {/* ── Contact Form ── */}
        <div className="mt-10">
          <h2 className="text-lg font-semibold text-gray-900">
            お問い合わせフォーム
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            以下のフォームに必要事項をご記入のうえ、送信してください。
          </p>

          <form
            action="mailto:nipoaisupport@gmail.com"
            method="POST"
            encType="text/plain"
            className="mt-6 space-y-5"
          >
            <FormField
              id="name"
              label="お名前"
              type="text"
              placeholder="山田 太郎"
              required
            />
            <FormField
              id="email"
              label="メールアドレス"
              type="email"
              placeholder="taro@example.com"
              required
            />
            <FormField
              id="subject"
              label="件名"
              type="text"
              placeholder="お問い合わせの件名"
              required
            />
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="message"
                className="text-sm font-medium text-gray-700"
              >
                お問い合わせ内容 <span className="text-red-500">*</span>
              </label>
              <textarea
                id="message"
                name="message"
                rows={6}
                required
                placeholder="お問い合わせ内容をご記入ください"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>
            <div>
              <Button type="submit" size="lg" className="w-full sm:w-auto">
                送信する
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <p className="mt-2 text-xs text-gray-400">
                ※ メールアプリが起動します。内容をご確認のうえ送信してください。
              </p>
            </div>
          </form>
        </div>

        {/* ── FAQ Link ── */}
        <div className="mt-14 rounded-xl border border-blue-100 bg-blue-50/50 p-6 text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
            <MessageSquare className="h-5 w-5 text-blue-600" />
          </div>
          <h3 className="mt-3 text-base font-semibold text-gray-900">
            よくある質問
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            お問い合わせの前に、よくある質問もご確認ください。
          </p>
          <div className="mt-4">
            <Link href="/#faq">
              <Button variant="outline" size="sm">
                FAQを確認する
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
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

function FormField({
  id,
  label,
  type,
  placeholder,
  required,
}: {
  id: string;
  label: string;
  type: string;
  placeholder: string;
  required?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        placeholder={placeholder}
        required={required}
        className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500"
      />
    </div>
  );
}
