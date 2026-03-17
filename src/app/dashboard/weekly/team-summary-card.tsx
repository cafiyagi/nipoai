"use client";

import { useState } from "react";
import {
  Sparkles,
  Loader2,
  ChevronDown,
  ChevronUp,
  Users,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface TeamSummaryData {
  id: string;
  weekStart: string;
  weekEnd: string;
  content: {
    team_highlights: string[];
    progress_overview: string[];
    challenges: string[];
    risks: string[];
    next_week_focus: string[];
  };
}

interface TeamSummaryCardProps {
  weekStart: string;
  weekEnd: string;
  weekLabel: string;
  existingSummary: TeamSummaryData | null;
  canGenerate: boolean;
  isAdmin: boolean;
}

const SECTION_LABELS: Record<string, string> = {
  team_highlights: "チームハイライト",
  progress_overview: "進捗概要",
  challenges: "共通課題",
  risks: "リスク・懸念事項",
  next_week_focus: "来週の重点",
};

const SECTION_KEYS = [
  "team_highlights",
  "progress_overview",
  "challenges",
  "risks",
  "next_week_focus",
] as const;

export function TeamSummaryCard({
  weekStart,
  weekEnd,
  weekLabel,
  existingSummary,
  canGenerate,
  isAdmin,
}: TeamSummaryCardProps) {
  const [summary, setSummary] = useState<TeamSummaryData | null>(
    existingSummary,
  );
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(!!existingSummary);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);

    try {
      const res = await fetch("/api/reports/team-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ week_start: weekStart }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "チームサマリーの生成に失敗しました");
        return;
      }

      if (data.status === "existing" || data.status === "created") {
        window.location.reload();
      }
    } catch {
      setError("ネットワークエラーが発生しました");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Card>
      <CardHeader
        className="cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="h-4 w-4 text-[var(--text-muted)]" />
            <CardTitle className="text-base">{weekLabel}</CardTitle>
            <span className="text-xs text-[var(--text-muted)]">
              {weekStart} 〜 {weekEnd}
            </span>
            {summary && <Badge variant="success">生成済み</Badge>}
          </div>
          <div className="flex items-center gap-2">
            {!summary && canGenerate && isAdmin && (
              <Button
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleGenerate();
                }}
                disabled={generating}
              >
                {generating ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                )}
                {generating ? "生成中..." : "サマリーを生成"}
              </Button>
            )}
            {expanded ? (
              <ChevronUp className="h-4 w-4 text-[var(--text-muted)]" />
            ) : (
              <ChevronDown className="h-4 w-4 text-[var(--text-muted)]" />
            )}
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent>
          {error && (
            <p className="mb-4 text-sm text-[var(--danger)]">{error}</p>
          )}

          {summary ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {SECTION_KEYS.map((key) => (
                <div
                  key={key}
                  className={`rounded-lg border border-[var(--border-primary)] p-4 ${
                    key === "risks"
                      ? "border-amber-200 dark:border-amber-500/20"
                      : ""
                  }`}
                >
                  <h4 className="mb-2 text-sm font-semibold text-[var(--text-primary)]">
                    {SECTION_LABELS[key]}
                  </h4>
                  <ul className="space-y-1">
                    {(summary.content[key] ?? []).map((item, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-sm text-[var(--text-secondary)]"
                      >
                        <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-[var(--text-muted)]" />
                        {item}
                      </li>
                    ))}
                    {(summary.content[key] ?? []).length === 0 && (
                      <li className="text-sm italic text-[var(--text-muted)]">
                        特記事項なし
                      </li>
                    )}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-sm text-[var(--text-secondary)]">
                この週のチームサマリーはまだ生成されていません。
              </p>
              {!canGenerate && (
                <p className="mt-2 text-xs text-[var(--text-muted)]">
                  チームサマリーはStarterプラン以上でご利用いただけます。
                </p>
              )}
              {canGenerate && !isAdmin && (
                <p className="mt-2 text-xs text-[var(--text-muted)]">
                  チームサマリーの生成は管理者のみ可能です。
                </p>
              )}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
