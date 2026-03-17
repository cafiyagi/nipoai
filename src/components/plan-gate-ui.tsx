"use client";

import Link from "next/link";
import { Lock } from "lucide-react";

interface PlanGateUIProps {
  planName?: string;
  featureName: string;
  children: React.ReactNode;
}

export function PlanGateUI({
  planName = "Starter",
  featureName,
  children,
}: PlanGateUIProps) {
  return (
    <div className="relative overflow-hidden rounded-xl">
      {/* Blurred content */}
      <div className="pointer-events-none select-none blur-sm">{children}</div>

      {/* Overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-[var(--bg-primary)]/60 backdrop-blur-[2px]">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--bg-hover)]">
          <Lock className="h-5 w-5 text-[var(--text-muted)]" />
        </div>
        <p className="mt-3 text-sm font-semibold text-[var(--text-primary)]">
          {featureName}
        </p>
        <p className="mt-1 text-xs text-[var(--text-secondary)]">
          {planName}プラン以上でご利用いただけます
        </p>
        <Link
          href="/dashboard/settings?tab=billing"
          className="mt-3 inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white hover:bg-blue-700"
        >
          アップグレード
        </Link>
      </div>
    </div>
  );
}
