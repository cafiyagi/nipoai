import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths, addMonths } from "date-fns";
import { ja } from "date-fns/locale";

import { getWorkspaceContext } from "@/lib/dashboard/get-workspace-context";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { ReportsList } from "./reports-list";
import type { ReportStatus, ReportContent, DailyReport } from "@/lib/supabase/types";

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
  const { user, supabase } = await getWorkspaceContext();

  // ---------- Month filter via searchParams ----------
  const params = await searchParams;
  const monthParam = params.month;

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
          <span className="min-w-[120px] text-center text-sm font-medium text-[var(--text-primary)]">
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
        <ReportsList reports={reports} />
      </div>
    </div>
  );
}
