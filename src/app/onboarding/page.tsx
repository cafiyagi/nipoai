"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

export default function OnboardingPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmed = name.trim();
    if (!trimmed) {
      setError("ワークスペース名を入力してください");
      return;
    }

    if (trimmed.length > 100) {
      setError("ワークスペース名は100文字以内で入力してください");
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const res = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "ワークスペースの作成に失敗しました");
        return;
      }

      router.push("/dashboard/settings");
    } catch {
      setError("ワークスペースの作成に失敗しました");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>ワークスペースを作成</CardTitle>
          <CardDescription>
            NipoAIを始めるには、ワークスペースを作成してください。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="ワークスペース名"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
              placeholder="例: 開発チーム"
              autoFocus
            />
            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}
            <Button type="submit" disabled={isCreating || !name.trim()}>
              {isCreating ? "作成中..." : "作成する"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
