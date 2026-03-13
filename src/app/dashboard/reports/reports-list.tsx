"use client";

import { useState } from "react";
import Link from "next/link";
import { FileText, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ReportDeleteButton } from "../report-delete-button";
import type { ReportStatus } from "@/lib/supabase/types";

const statusConfig: Record<
  ReportStatus,
  { label: string; variant: "success" | "default" | "secondary" }
> = {
  submitted: { label: "提出済み", variant: "success" },
  delivered: { label: "配信済み", variant: "success" },
  draft: { label: "下書き", variant: "default" },
  generating: { label: "生成中", variant: "secondary" },
};

interface ReportItem {
  id: string;
  date: string;
  status: ReportStatus;
  summary: string;
}

export function ReportsList({ reports: initialReports }: { reports: ReportItem[] }) {
  const [reports, setReports] = useState(initialReports);

  const handleDeleted = (reportId: string) => {
    setReports((prev) => prev.filter((r) => r.id !== reportId));
  };

  if (reports.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white py-16 text-center shadow-sm">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
          <FileText className="h-6 w-6 text-gray-400" />
        </div>
        <p className="mt-4 text-sm font-medium text-gray-900">
          まだ日報がありません
        </p>
        <p className="mt-1 max-w-xs text-sm text-gray-500">
          Slackを連携すると自動で日報が生成されます。
        </p>
        <Link href="/dashboard/slack" className="mt-4">
          <Button size="sm" variant="outline">
            <MessageSquare className="mr-2 h-4 w-4" />
            Slack連携して始める
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {reports.map((report) => {
        const config = statusConfig[report.status];
        return (
          <Card key={report.id} className="transition-shadow hover:shadow-md">
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <Link
                  href={`/dashboard/reports/${report.id}`}
                  className="flex min-w-0 flex-1 items-start gap-4"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100">
                    <FileText className="h-5 w-5 text-gray-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-medium text-gray-900">
                        {report.date}
                      </h3>
                      <Badge variant={config.variant}>
                        {config.label}
                      </Badge>
                    </div>
                    {report.summary ? (
                      <p className="mt-1 line-clamp-2 text-sm text-gray-500">
                        {report.summary}
                      </p>
                    ) : (
                      <p className="mt-1 text-sm italic text-gray-400">
                        日報が生成されていません
                      </p>
                    )}
                  </div>
                </Link>
                <ReportDeleteButton
                  reportId={report.id}
                  status={report.status}
                  onDeleted={handleDeleted}
                />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
