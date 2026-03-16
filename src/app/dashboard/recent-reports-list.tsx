"use client";

import { useState } from "react";
import Link from "next/link";
import { FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ReportDeleteButton } from "./report-delete-button";

interface ReportItem {
  id: string;
  date: string;
  status: string;
  summary: string;
}

const statusConfig: Record<
  string,
  { label: string; variant: "success" | "default" | "secondary" }
> = {
  submitted: { label: "提出済み", variant: "success" },
  delivered: { label: "配信済み", variant: "success" },
  draft: { label: "下書き", variant: "default" },
  generating: { label: "生成中", variant: "secondary" },
  not_generated: { label: "未生成", variant: "secondary" },
};

export function RecentReportsList({ reports: initialReports }: { reports: ReportItem[] }) {
  const [reports, setReports] = useState(initialReports);

  const handleDeleted = (reportId: string) => {
    setReports((prev) => prev.filter((r) => r.id !== reportId));
  };

  if (reports.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--bg-hover)]">
          <FileText className="h-6 w-6 text-[var(--text-muted)]" />
        </div>
        <p className="mt-4 text-sm font-medium text-[var(--text-primary)]">
          まだ日報がありません
        </p>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Slackを連携すると、メッセージから自動で日報が生成されます。
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col divide-y divide-gray-100">
      {reports.map((report) => {
        const config = statusConfig[report.status] ?? statusConfig.not_generated;
        return (
          <div
            key={report.id}
            className="-mx-2 flex items-center gap-4 rounded-lg px-2 py-3 transition-colors hover:bg-[var(--bg-hover)]"
          >
            <Link
              href={`/dashboard/reports/${report.id}`}
              className="flex min-w-0 flex-1 items-center gap-4"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--bg-hover)]">
                <FileText className="h-4 w-4 text-[var(--text-secondary)]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  {report.date}
                </p>
                {report.summary ? (
                  <p className="mt-0.5 truncate text-sm text-[var(--text-secondary)]">
                    {report.summary}
                  </p>
                ) : (
                  <p className="mt-0.5 text-sm italic text-[var(--text-muted)]">
                    内容なし
                  </p>
                )}
              </div>
              <Badge variant={config.variant}>{config.label}</Badge>
            </Link>
            <ReportDeleteButton
              reportId={report.id}
              status={report.status}
              onDeleted={handleDeleted}
            />
          </div>
        );
      })}
    </div>
  );
}
