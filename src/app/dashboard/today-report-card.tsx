"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  Loader2,
  CheckCircle,
  Edit3,
  MessageSquare,
  RefreshCw,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TodayReportCardProps {
  initialStatus: "not_generated" | "draft" | "submitted" | "delivered";
  todayReportId: string | null;
  slackConnected: boolean;
  reportGenerationTime: string | null;
}

type CardState =
  | "no_slack"
  | "not_generated"
  | "generating"
  | "draft"
  | "submitted";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TodayReportCard({
  initialStatus,
  todayReportId,
  slackConnected,
  reportGenerationTime,
}: TodayReportCardProps) {
  const [state, setState] = useState<CardState>(() => {
    if (initialStatus === "submitted" || initialStatus === "delivered")
      return "submitted";
    if (initialStatus === "draft") return "draft";
    if (!slackConnected) return "no_slack";
    return "not_generated";
  });
  const [reportId, setReportId] = useState<string | null>(todayReportId);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  const handleGenerate = async (regenerate = false) => {
    setState("generating");
    setErrorMessage(null);
    setErrorCode(null);

    try {
      const url = regenerate
        ? "/api/reports/generate?regenerate=true"
        : "/api/reports/generate";
      const res = await fetch(url, { method: "POST" });
      const data = await res.json();

      if (res.status === 409) {
        // Already submitted/delivered
        setState("submitted");
        if (data.reportId) setReportId(data.reportId);
        return;
      }

      if (!res.ok) {
        setState("not_generated");
        setErrorMessage(data.error ?? "日報の生成に失敗しました");
        setErrorCode(data.code ?? null);
        return;
      }

      // Success
      setReportId(data.reportId);
      setState("draft");
    } catch {
      setState("not_generated");
      setErrorMessage("ネットワークエラーが発生しました");
    }
  };

  // -------------------------------------------------------------------------
  // State-specific rendering
  // -------------------------------------------------------------------------

  const config = getStateConfig(state, reportGenerationTime);

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Left: icon + text */}
        <div className="flex items-center gap-4">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${config.iconBg}`}
          >
            <config.Icon className={`h-5 w-5 ${config.iconColor}`} />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">
              今日の日報
            </p>
            <p className="mt-0.5 text-sm text-gray-500">
              {config.description}
            </p>
          </div>
        </div>

        {/* Right: action */}
        <div className="flex flex-col items-start gap-2 sm:items-end">
          {state === "no_slack" && (
            <Link href="/dashboard/settings">
              <Button variant="outline" size="sm">
                <MessageSquare className="mr-2 h-4 w-4" />
                Slack連携して始める
              </Button>
            </Link>
          )}

          {state === "not_generated" && (
            <>
              <Button size="sm" onClick={() => handleGenerate()}>
                <Sparkles className="mr-2 h-4 w-4" />
                日報を生成する
              </Button>
              {reportGenerationTime && (
                <span className="text-xs text-gray-400">
                  自動生成: 毎日 {reportGenerationTime}
                </span>
              )}
            </>
          )}

          {state === "generating" && (
            <Button size="sm" disabled>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              生成中...
            </Button>
          )}

          {state === "draft" && reportId && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleGenerate(true)}
              >
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                再生成
              </Button>
              <Link href={`/dashboard/reports/${reportId}`}>
                <Button size="sm">確認する</Button>
              </Link>
            </div>
          )}

          {state === "submitted" && reportId && (
            <Link href={`/dashboard/reports/${reportId}`}>
              <Button variant="ghost" size="sm">
                内容を確認
              </Button>
            </Link>
          )}

          {/* Error message */}
          {errorMessage && (
            <div className="flex flex-col items-start gap-1">
              <p className="text-xs text-red-600">{errorMessage}</p>
              {(errorCode === "NO_SLACK" || errorCode === "NO_CHANNELS") && (
                <Link href="/dashboard/settings" className="text-xs text-blue-600 hover:underline">
                  設定画面を開く →
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// State configuration
// ---------------------------------------------------------------------------

function getStateConfig(
  state: CardState,
  reportGenerationTime: string | null,
) {
  switch (state) {
    case "no_slack":
      return {
        Icon: MessageSquare,
        iconBg: "bg-gray-100",
        iconColor: "text-gray-400",
        description:
          "Slackを連携して日報の自動生成を始めましょう",
      };
    case "not_generated":
      return {
        Icon: Sparkles,
        iconBg: "bg-blue-50",
        iconColor: "text-blue-600",
        description:
          "Slackのメッセージから今日の日報を生成できます",
      };
    case "generating":
      return {
        Icon: Loader2,
        iconBg: "bg-blue-50",
        iconColor: "text-blue-600 animate-spin",
        description: "AIが日報を生成しています...",
      };
    case "draft":
      return {
        Icon: Edit3,
        iconBg: "bg-amber-50",
        iconColor: "text-amber-600",
        description:
          "AIが日報を生成しました。確認して提出してください",
      };
    case "submitted":
      return {
        Icon: CheckCircle,
        iconBg: "bg-green-50",
        iconColor: "text-green-600",
        description: "本日の日報は完了しています",
      };
  }
}
