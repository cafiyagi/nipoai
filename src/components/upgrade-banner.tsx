"use client";

import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

interface UpgradeBannerProps {
  title: string;
  description: string;
  planName?: string;
  className?: string;
}

export function UpgradeBanner({
  title,
  description,
  planName = "Starter",
  className = "",
}: UpgradeBannerProps) {
  return (
    <div
      className={`rounded-lg border border-blue-200 bg-gradient-to-r from-blue-50 to-blue-100 p-4 dark:border-blue-500/20 dark:from-blue-500/10 dark:to-blue-600/10 ${className}`}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-500/20">
          <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-blue-900 dark:text-blue-200">
            {title}
          </p>
          <p className="mt-0.5 text-xs text-blue-700 dark:text-blue-300">
            {description}
          </p>
          <Link
            href="/dashboard/settings/billing"
            className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
          >
            {planName}にアップグレード
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
