"use client";

import { useState } from "react";
import { Lock } from "lucide-react";

interface WeeklyTabsProps {
  personalContent: React.ReactNode;
  teamContent: React.ReactNode;
  teamSummaryAvailable: boolean;
}

export function WeeklyTabs({
  personalContent,
  teamContent,
  teamSummaryAvailable,
}: WeeklyTabsProps) {
  const [activeTab, setActiveTab] = useState<"personal" | "team">("personal");

  return (
    <div>
      <div className="mb-6 flex gap-1 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-1">
        <button
          onClick={() => setActiveTab("personal")}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "personal"
              ? "bg-[var(--bg-primary)] text-[var(--text-primary)] shadow-sm"
              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          }`}
        >
          個人週報
        </button>
        <button
          onClick={() => teamSummaryAvailable && setActiveTab("team")}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "team"
              ? "bg-[var(--bg-primary)] text-[var(--text-primary)] shadow-sm"
              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          } ${!teamSummaryAvailable ? "cursor-not-allowed opacity-50" : ""}`}
          disabled={!teamSummaryAvailable}
        >
          チームサマリー
          {!teamSummaryAvailable && <Lock className="h-3.5 w-3.5" />}
        </button>
      </div>

      {activeTab === "personal" ? personalContent : teamContent}
    </div>
  );
}
