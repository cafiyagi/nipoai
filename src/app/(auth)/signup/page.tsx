"use client";

import { useState } from "react";
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
import { signUpWithEmail } from "@/lib/auth/actions";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await signUpWithEmail(email, password, name);
      // If signUpWithEmail succeeds, it redirects and never returns.
      // If it returns, there was an error.
      if (result?.error) {
        setError(result.error);
      }
    } catch {
      // redirect() throws a NEXT_REDIRECT error - that is expected.
      setError("登録中にエラーが発生しました。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">アカウント作成</CardTitle>
        <CardDescription>
          NipoAIで日報自動生成を始めましょう
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-6">
          {/* Error display */}
          {error && (
            <div
              className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700"
              role="alert"
            >
              {error}
            </div>
          )}

          {/* Email form */}
          <form onSubmit={handleEmailSignup} className="flex flex-col gap-4">
            <Input
              label="お名前"
              type="text"
              placeholder="山田 太郎"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
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
              minLength={8}
            />
            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? "登録中..." : "アカウントを作成"}
            </Button>
          </form>

          {/* Login link */}
          <p className="text-center text-sm text-gray-500">
            すでにアカウントをお持ちの方は{" "}
            <Link
              href="/login"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              ログイン
            </Link>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
