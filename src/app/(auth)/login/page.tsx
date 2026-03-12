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
import { signInWithEmail } from "@/lib/auth/actions";

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
              {loading ? "ログイン中..." : "ログイン"}
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
