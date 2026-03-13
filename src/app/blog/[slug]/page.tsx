import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MDXRemote } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import { getAllPosts, getPostBySlug, getAdjacentPosts } from "@/lib/blog";
import type { Metadata } from "next";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const posts = getAllPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return {};

  return {
    title: post.frontmatter.title,
    description: post.frontmatter.description,
    openGraph: {
      title: post.frontmatter.title,
      description: post.frontmatter.description,
      type: "article",
      publishedTime: post.frontmatter.date,
      url: `https://nipoai.app/blog/${slug}`,
      tags: post.frontmatter.tags,
    },
    twitter: {
      card: "summary_large_image",
      title: post.frontmatter.title,
      description: post.frontmatter.description,
    },
    alternates: {
      canonical: `https://nipoai.app/blog/${slug}`,
    },
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const { prev, next } = getAdjacentPosts(slug);

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
        {/* Back link */}
        <Link
          href="/blog"
          className="mb-8 inline-flex items-center gap-1 text-sm text-gray-400 transition-colors hover:text-gray-600"
        >
          <ChevronLeft className="h-4 w-4" />
          ブログ一覧に戻る
        </Link>

        {/* Article header */}
        <article>
          <header className="mb-8 border-b border-gray-100 pb-8">
            <time className="text-sm font-medium text-gray-400">
              {formatDate(post.frontmatter.date)}
            </time>
            <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl lg:text-4xl">
              {post.frontmatter.title}
            </h1>
            <p className="mt-4 text-base leading-relaxed text-gray-500">
              {post.frontmatter.description}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {post.frontmatter.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600"
                >
                  {tag}
                </span>
              ))}
            </div>
          </header>

          {/* MDX content */}
          <div className="prose prose-gray max-w-none prose-headings:font-bold prose-headings:tracking-tight prose-h2:mt-10 prose-h2:text-xl prose-h3:mt-8 prose-h3:text-lg prose-p:leading-relaxed prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline prose-strong:text-gray-900 prose-code:rounded prose-code:bg-gray-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:text-sm prose-code:before:content-none prose-code:after:content-none prose-pre:rounded-xl prose-pre:bg-gray-950 prose-table:text-sm prose-th:bg-gray-50 prose-th:px-4 prose-th:py-2 prose-td:px-4 prose-td:py-2">
            <MDXRemote
              source={post.content}
              options={{
                mdxOptions: {
                  remarkPlugins: [remarkGfm],
                  rehypePlugins: [rehypeSlug, rehypeAutolinkHeadings],
                },
              }}
            />
          </div>
        </article>

        {/* Adjacent posts navigation */}
        {(prev || next) && (
          <nav className="mt-14 grid gap-4 border-t border-gray-100 pt-8 sm:grid-cols-2">
            {prev ? (
              <Link
                href={`/blog/${prev.slug}`}
                className="group rounded-lg border border-gray-100 p-4 transition-colors hover:border-gray-200 hover:bg-gray-50"
              >
                <span className="flex items-center gap-1 text-xs text-gray-400">
                  <ArrowLeft className="h-3 w-3" />
                  前の記事
                </span>
                <p className="mt-1 text-sm font-medium text-gray-700 group-hover:text-blue-600">
                  {prev.frontmatter.title}
                </p>
              </Link>
            ) : (
              <div />
            )}
            {next && (
              <Link
                href={`/blog/${next.slug}`}
                className="group rounded-lg border border-gray-100 p-4 text-right transition-colors hover:border-gray-200 hover:bg-gray-50"
              >
                <span className="flex items-center justify-end gap-1 text-xs text-gray-400">
                  次の記事
                  <ArrowRight className="h-3 w-3" />
                </span>
                <p className="mt-1 text-sm font-medium text-gray-700 group-hover:text-blue-600">
                  {next.frontmatter.title}
                </p>
              </Link>
            )}
          </nav>
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
