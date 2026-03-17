import Link from "next/link";
import { getWorkspaceContext } from "@/lib/dashboard/get-workspace-context";
import { Header } from "@/components/layout/header";
import { PLANS } from "@/lib/constants";
import { AnalyticsDashboard } from "./analytics-dashboard";
import type { Plan } from "@/lib/supabase/types";

export default async function AnalyticsPage() {
  const { workspace, workspaceId } = await getWorkspaceContext();

  const plan = workspace.plan as Plan;
  const hasAccess = PLANS[plan].limits.adminDashboard;

  return (
    <div>
      <Header title="分析" />

      <div className="p-6">
        {hasAccess ? (
          <>
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                チーム分析ダッシュボード
              </h2>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                チーム全体の日報提出状況を分析できます。
              </p>
            </div>
            <AnalyticsDashboard workspaceId={workspaceId} />
          </>
        ) : (
          <div className="mx-auto max-w-lg py-20 text-center">
            {/* Blur preview with dummy data */}
            <div className="relative mb-8 overflow-hidden rounded-xl">
              <div className="pointer-events-none select-none blur-sm">
                <div className="grid gap-4 sm:grid-cols-3">
                  {[
                    { label: "平均提出率", value: "85%" },
                    { label: "総提出数", value: "127件" },
                    { label: "未提出者", value: "2人" },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-card)] p-4"
                    >
                      <p className="text-sm text-[var(--text-secondary)]">
                        {stat.label}
                      </p>
                      <p className="mt-1 text-2xl font-bold text-[var(--text-primary)]">
                        {stat.value}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-card)] p-4">
                  <div className="h-48 rounded bg-[var(--bg-hover)]" />
                </div>
              </div>

              {/* Overlay */}
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-[var(--bg-primary)]/60 backdrop-blur-[2px]">
                <p className="text-lg font-semibold text-[var(--text-primary)]">
                  チーム分析ダッシュボード
                </p>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  Teamプランで日報提出率・メンバー別分析が利用可能になります。
                </p>
                <Link
                  href="/dashboard/settings/billing"
                  className="mt-4 inline-flex items-center rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
                >
                  Teamにアップグレード
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
