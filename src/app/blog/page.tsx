import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAllPosts } from "@/lib/blog";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ブログ",
  description:
    "NipoAIの開発チームによるブログ。プロダクトアップデート、技術的な知見、Build in Publicの記録をお届けします。",
  openGraph: {
    title: "ブログ | NipoAI",
    description:
      "NipoAIの開発チームによるブログ。プロダクトアップデート、技術的な知見、Build in Publicの記録をお届けします。",
    url: "https://nipoai.app/blog",
  },
  alternates: {
    canonical: "https://nipoai.app/blog",
  },
};

export default function BlogListPage() {
  const posts = getAllPosts();

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
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

      {/* Main */}
      <main className="mx-auto max-w-3xl px-4 pb-20 pt-28 sm:px-6 sm:pt-32">
        <div className="mb-10 sm:mb-14">
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
            ブログ
          </h1>
          <p className="mt-3 text-base text-gray-500">
            プロダクトアップデート、技術的な知見、Build in
            Publicの記録をお届けします。
          </p>
        </div>

        {posts.length === 0 ? (
          <p className="text-gray-400">記事がまだありません。</p>
        ) : (
          <div className="flex flex-col gap-8">
            {posts.map((post) => (
              <article
                key={post.slug}
                className="group rounded-xl border border-gray-100 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
              >
                <Link href={`/blog/${post.slug}`} className="block">
                  <time className="text-xs font-medium text-gray-400">
                    {formatDate(post.frontmatter.date)}
                  </time>
                  <h2 className="mt-2 text-lg font-bold text-gray-900 group-hover:text-blue-600 sm:text-xl">
                    {post.frontmatter.title}
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-gray-500">
                    {post.frontmatter.description}
                  </p>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    {post.frontmatter.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </Link>
              </article>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
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
              <Link href="#" className="transition-colors hover:text-gray-900">
                特定商取引法に基づく表記
              </Link>
              <Link href="#" className="transition-colors hover:text-gray-900">
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

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}
