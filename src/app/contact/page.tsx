import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MessageSquare, ArrowRight } from "lucide-react";
import { ContactForm } from "./contact-form";

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

        {/* ── Contact Form ── */}
        <ContactForm />

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
