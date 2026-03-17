"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";

interface UsageBarProps {
  used: number;
  limit: number;
  remaining: number;
}

export function UsageBar({ used, limit, remaining }: UsageBarProps) {
  const percentage = Math.min(100, (used / limit) * 100);
  const isWarning = remaining <= 3 && remaining > 0;
  const isDanger = remaining === 0;

  const barColor = isDanger
    ? "bg-[var(--danger)]"
    : isWarning
    ? "bg-amber-500"
    : "bg-blue-500";

  const textColor = isDanger
    ? "text-[var(--danger)]"
    : isWarning
    ? "text-amber-500"
    : "text-[var(--text-secondary)]";

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-[var(--text-primary)]">
            今月のAI日報生成
          </p>
          <p className={`mt-0.5 text-xs ${textColor}`}>
            {used}/{limit}回使用済み（残り{remaining}回）
          </p>
        </div>
        {(isWarning || isDanger) && (
          <Link
            href="/dashboard/settings?tab=billing"
            className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
          >
            アップグレード →
          </Link>
        )}
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--bg-hover)]">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </Card>
  );
}
