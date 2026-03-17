"use client";

import { useState, useCallback } from "react";
import { MessageSquare, Lock, Loader2 } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";

interface OneOnOneAgendaContent {
  recognition_points: string[];
  follow_up_items: string[];
  growth_topics: string[];
  confirmation_items: string[];
}

interface OneOnOneButtonProps {
  targetUserId: string;
  memberName: string;
  isAdmin: boolean;
  planAllowed: boolean;
}

const SECTIONS: {
  key: keyof OneOnOneAgendaContent;
  label: string;
  color: string;
}[] = [
  {
    key: "recognition_points",
    label: "成果の承認ポイント",
    color: "text-green-600",
  },
  {
    key: "follow_up_items",
    label: "課題へのフォロー",
    color: "text-amber-600",
  },
  {
    key: "growth_topics",
    label: "キャリア・成長",
    color: "text-blue-600",
  },
  {
    key: "confirmation_items",
    label: "確認事項",
    color: "text-purple-600",
  },
];

export function OneOnOneButton({
  targetUserId,
  memberName,
  isAdmin,
  planAllowed,
}: OneOnOneButtonProps) {
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [content, setContent] = useState<OneOnOneAgendaContent | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleClick = useCallback(async () => {
    if (!planAllowed || !isAdmin) return;

    setLoading(true);
    setError(null);
    setContent(null);

    try {
      const res = await fetch("/api/reports/one-on-one", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target_user_id: targetUserId }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "エラーが発生しました");
        setDialogOpen(true);
        return;
      }

      setContent(data.content);
      setDialogOpen(true);
    } catch {
      setError("通信エラーが発生しました");
      setDialogOpen(true);
    } finally {
      setLoading(false);
    }
  }, [targetUserId, planAllowed, isAdmin]);

  if (!isAdmin) return null;

  if (!planAllowed) {
    return (
      <button
        disabled
        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-[var(--text-muted)] opacity-60 cursor-not-allowed"
        title="Teamプラン以上で利用可能"
      >
        <Lock className="h-3.5 w-3.5" />
        1on1準備
      </button>
    );
  }

  return (
    <>
      <button
        onClick={handleClick}
        disabled={loading}
        className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--bg-hover)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--border-primary)] disabled:opacity-50"
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <MessageSquare className="h-3.5 w-3.5" />
        )}
        1on1準備
      </button>

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={`1on1アジェンダ — ${memberName}`}
        description="直近14日間の日報からAIが生成したトーキングポイント"
        className="max-w-lg"
      >
        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
            {error}
          </div>
        ) : content ? (
          <div className="flex flex-col gap-4 max-h-[60vh] overflow-y-auto">
            {SECTIONS.map((section) => {
              const items = content[section.key];
              if (!items || items.length === 0) return null;
              return (
                <div
                  key={section.key}
                  className="rounded-lg border border-[var(--border-primary)] p-4"
                >
                  <h3
                    className={`mb-2 text-sm font-semibold ${section.color}`}
                  >
                    {section.label}
                  </h3>
                  <ul className="flex flex-col gap-1.5">
                    {items.map((item, i) => (
                      <li
                        key={i}
                        className="text-sm text-[var(--text-secondary)] leading-relaxed"
                      >
                        ・{item}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        ) : null}
      </Dialog>
    </>
  );
}
