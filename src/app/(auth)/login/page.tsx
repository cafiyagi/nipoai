"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { signInWithEmail, signInWithGoogle } from "@/lib/auth/actions";

const MESSAGE_MAP: Record<string, string> = {
  auth_failed: "認証に失敗しました。もう一度お試しください。",
  confirm_email:
    "確認メールを送信しました。メール内のリンクをクリックしてアカウントを有効化してください。",
  session_expired: "セッションが切れました。再度ログインしてください。",
};

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex justify-center p-8"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" /></div>}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Show message from URL params (e.g. after signup, auth callback error)
  const urlError = searchParams.get("error");
  const urlMessage = searchParams.get("message");
  const displayMessage =
    (urlError && MESSAGE_MAP[urlError]) ||
    (urlMessage && MESSAGE_MAP[urlMessage]) ||
    null;

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await signInWithGoogle();
      if (result?.error) {
        setError(result.error);
      }
    } catch {
      // redirect() throws — expected
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await signInWithEmail(email, password);
      // If signInWithEmail succeeds, it redirects and never returns.
      // If it returns, there was an error.
      if (result?.error) {
        setError(result.error);
      }
    } catch {
      // redirect() throws a NEXT_REDIRECT error - that is expected.
      // Any other error is unexpected.
      setError("ログイン中にエラーが発生しました。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">ログイン</CardTitle>
        <CardDescription>
          アカウントにログインして日報管理を始めましょう
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-6">
          {/* URL-based messages */}
          {displayMessage && (
            <div
              className={`rounded-lg px-4 py-3 text-sm ${
                urlMessage === "confirm_email"
                  ? "bg-blue-50 text-blue-700"
                  : "bg-red-50 text-red-700"
              }`}
              role="alert"
            >
              {displayMessage}
            </div>
          )}

          {/* Inline error */}
          {error && (
            <div
              className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700"
              role="alert"
            >
              {error}
            </div>
          )}

          {/* Google login */}
          <div>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleGoogleLogin}
              disabled={loading}
            >
              <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Googleでログイン
            </Button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-white px-4 text-gray-400">または</span>
            </div>
          </div>

          {/* Email form */}
          <form onSubmit={handleEmailLogin} className="flex flex-col gap-4">
            <Input
              label="メールアドレス"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              label="パスワード"
              type="password"
              placeholder="8文字以上"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? "ログイン中..." : "メールでログイン"}
            </Button>
          </form>

          {/* Signup link */}
          <p className="text-center text-sm text-gray-500">
            アカウントをお持ちでない方は{" "}
            <Link
              href="/signup"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              新規登録
            </Link>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
