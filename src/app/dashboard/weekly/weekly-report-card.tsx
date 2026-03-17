"use client";

import { useState } from "react";
import {
  Sparkles,
  Loader2,
  CheckCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface WeeklyReportData {
  id: string;
  weekStart: string;
  weekEnd: string;
  content: {
    highlights: string[];
    progress: string[];
    challenges: string[];
    next_week_focus: string[];
  };
}

interface WeeklyReportCardProps {
  weekStart: string;
  weekEnd: string;
  weekLabel: string;
  existingReport: WeeklyReportData | null;
  canGenerate: boolean;
}

const SECTION_LABELS: Record<string, string> = {
  highlights: "ハイライト",
  progress: "進捗状況",
  challenges: "課題",
  next_week_focus: "来週の重点",
};

export function WeeklyReportCard({
  weekStart,
  weekEnd,
  weekLabel,
  existingReport,
  canGenerate,
}: WeeklyReportCardProps) {
  const [report, setReport] = useState<WeeklyReportData | null>(existingReport);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(!!existingReport);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);

    try {
      const res = await fetch("/api/reports/weekly", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ week_start: weekStart }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "週報の生成に失敗しました");
        return;
      }

      // Re-fetch the report to get content
      if (data.status === "existing" || data.status === "created") {
        // Reload page to get fresh data
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
      <CardHeader className="cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-base">{weekLabel}</CardTitle>
            <span className="text-xs text-[var(--text-muted)]">
              {weekStart} 〜 {weekEnd}
            </span>
            {report && (
              <Badge variant="success">生成済み</Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!report && canGenerate && (
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
                {generating ? "生成中..." : "週報を生成"}
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

          {report ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {(["highlights", "progress", "challenges", "next_week_focus"] as const).map(
                (key) => (
                  <div key={key} className="rounded-lg border border-[var(--border-primary)] p-4">
                    <h4 className="mb-2 text-sm font-semibold text-[var(--text-primary)]">
                      {SECTION_LABELS[key]}
                    </h4>
                    <ul className="space-y-1">
                      {report.content[key].map((item, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 text-sm text-[var(--text-secondary)]"
                        >
                          <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-[var(--text-muted)]" />
                          {item}
                        </li>
                      ))}
                      {report.content[key].length === 0 && (
                        <li className="text-sm italic text-[var(--text-muted)]">
                          特記事項なし
                        </li>
                      )}
                    </ul>
                  </div>
                ),
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-sm text-[var(--text-secondary)]">
                この週の週報はまだ生成されていません。
              </p>
              {!canGenerate && (
                <p className="mt-2 text-xs text-[var(--text-muted)]">
                  週報生成はStarterプラン以上でご利用いただけます。
                </p>
              )}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
