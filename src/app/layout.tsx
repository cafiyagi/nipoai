import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { ToastProvider } from "@/components/ui/toast";
import { ThemeProvider } from "@/components/theme-provider";
import { PageTracker } from "@/components/page-tracker";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://nipoai.app"),
  title: {
    default: "NipoAI - AI日報自動生成 | Slack連携で日報をワンクリック作成",
    template: "%s | NipoAI",
  },
  description:
    "Slackの会話からAIが日報を自動生成。毎日15分の作成時間をゼロに。セットアップ1分、クレジットカード不要で今すぐ無料で始められます。",
  openGraph: {
    type: "website",
    locale: "ja_JP",
    url: "https://nipoai.app",
    siteName: "NipoAI",
    title: "NipoAI - AI日報自動生成 | Slack連携で日報をワンクリック作成",
    description:
      "Slackの会話からAIが日報を自動生成。毎日15分の作成時間をゼロに。セットアップ1分、クレジットカード不要で今すぐ無料で始められます。",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "NipoAI - AI日報自動生成サービス",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "NipoAI - AI日報自動生成 | Slack連携で日報をワンクリック作成",
    description:
      "Slackの会話からAIが日報を自動生成。毎日15分の作成時間をゼロに。",
    images: ["/og-image.png"],
  },
  alternates: {
    canonical: "https://nipoai.app",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem('nipoai-theme');if(t==='light')document.documentElement.setAttribute('data-theme','light');})();`,
          }}
        />
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        <ThemeProvider>
          <ToastProvider>{children}</ToastProvider>
        </ThemeProvider>
        <PageTracker />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
