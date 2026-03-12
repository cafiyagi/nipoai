import Link from "next/link";
import { FileText, MessageSquare, ChevronLeft, ChevronRight } from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths, addMonths } from "date-fns";
import { ja } from "date-fns/locale";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ReportStatus, ReportContent, DailyReport } from "@/lib/supabase/types";

// ---------------------------------------------------------------------------
// Status display configuration
// ---------------------------------------------------------------------------

const statusConfig: Record<
  ReportStatus,
  { label: string; variant: "success" | "default" | "secondary" }
> = {
  submitted: { label: "提出済み", variant: "success" },
  delivered: { label: "配信済み", variant: "success" },
  draft: { label: "下書き", variant: "default" },
  generating: { label: "生成中", variant: "secondary" },
};

// ---------------------------------------------------------------------------
// Helper: build summary from JSONB content
// ---------------------------------------------------------------------------

function buildSummary(content: ReportContent | null): string {
  if (!content) return "";
  const achievements = content.achievements ?? [];
  if (achievements.length > 0) return achievements.join("、");
  const challenges = content.challenges ?? [];
  if (challenges.length > 0) return challenges.join("、");
  return "";
}

// ---------------------------------------------------------------------------
// Page component (Server Component)
// ---------------------------------------------------------------------------

interface ReportsPageProps {
  searchParams: Promise<{ month?: string }>;
}

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const supabase = await createClient();

  // ---------- Auth ----------
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // ---------- Month filter via searchParams ----------
  const params = await searchParams;
  const monthParam = params.month; // e.g. "2026-03"

  let currentMonth: Date;
  if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
    currentMonth = new Date(`${monthParam}-01T00:00:00`);
  } else {
    currentMonth = startOfMonth(new Date());
  }

  const monthStart = format(startOfMonth(currentMonth), "yyyy-MM-dd");
  const monthEnd = format(endOfMonth(currentMonth), "yyyy-MM-dd");

  // Navigation month URLs
  const prevMonth = format(subMonths(currentMonth, 1), "yyyy-MM");
  const nextMonth = format(addMonths(currentMonth, 1), "yyyy-MM");
  const currentMonthStr = format(currentMonth, "yyyy-MM");
  const todayMonthStr = format(new Date(), "yyyy-MM");
  const isCurrentMonth = currentMonthStr === todayMonthStr;

  // Month display label
  const monthLabel = format(currentMonth, "yyyy年M月", { locale: ja });

  // ---------- Fetch reports for the selected month ----------
  const { data: rawReportsData } = await supabase
    .from("daily_reports")
    .select("id, report_date, status, content")
    .eq("user_id", user.id)
    .gte("report_date", monthStart)
    .lte("report_date", monthEnd)
    .order("report_date", { ascending: false });

  const reportsRaw = (rawReportsData ?? []) as unknown as Pick<
    DailyReport,
    "id" | "report_date" | "status" | "content"
  >[];

  const reports = reportsRaw.map((r) => ({
    id: r.id,
    date: format(new Date(r.report_date + "T00:00:00"), "yyyy年M月d日（E）", {
      locale: ja,
    }),
    status: r.status as ReportStatus,
    summary: buildSummary(r.content ?? null),
  }));

  return (
    <div>
      <Header title="日報一覧" />

      <div className="p-6">
        {/* Month filter */}
        <div className="mb-6 flex items-center gap-2">
          <Link href={`/dashboard/reports?month=${prevMonth}`}>
            <Button variant="ghost" size="sm">
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </Link>
          <span className="min-w-[120px] text-center text-sm font-medium text-gray-900">
            {monthLabel}
          </span>
          {!isCurrentMonth ? (
            <Link href={`/dashboard/reports?month=${nextMonth}`}>
              <Button variant="ghost" size="sm">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          ) : (
            <Button variant="ghost" size="sm" disabled>
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Reports list */}
        {reports.length === 0 ? (
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
        ) : (
          <div className="flex flex-col gap-3">
            {reports.map((report) => {
              const config = statusConfig[report.status];
              return (
                <Link
                  key={report.id}
                  href={`/dashboard/reports/${report.id}`}
                >
                  <Card className="transition-shadow hover:shadow-md">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
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
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
