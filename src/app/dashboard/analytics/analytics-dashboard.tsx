"use client";

import { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import { Loader2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface AnalyticsDashboardProps {
  workspaceId: string;
}

interface DailyData {
  date: string;
  submitted: number;
  rate: number;
}

interface MemberDetail {
  userId: string;
  name: string;
  count: number;
}

export function AnalyticsDashboard({ workspaceId }: AnalyticsDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dailyData, setDailyData] = useState<DailyData[]>([]);
  const [memberDetails, setMemberDetails] = useState<MemberDetail[]>([]);
  const [totalMembers, setTotalMembers] = useState(0);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(
          `/api/analytics/submission-rate?workspace_id=${workspaceId}&days=30`,
        );
        const data = await res.json();

        if (!res.ok) {
          setError(data.error ?? "データの取得に失敗しました");
          return;
        }

        setDailyData(data.dailyData);
        setMemberDetails(data.memberDetails);
        setTotalMembers(data.totalMembers);
      } catch {
        setError("ネットワークエラーが発生しました");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [workspaceId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--text-muted)]" />
        <span className="ml-2 text-sm text-[var(--text-secondary)]">
          分析データを読み込み中...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-[var(--danger)] bg-red-50 p-6 text-center dark:bg-red-500/10">
        <p className="text-sm text-[var(--danger)]">{error}</p>
      </div>
    );
  }

  // Calculate summary stats
  const last7Days = dailyData.slice(-7);
  const avgRate7d =
    last7Days.length > 0
      ? Math.round(last7Days.reduce((s, d) => s + d.rate, 0) / last7Days.length)
      : 0;
  const totalSubmissions = dailyData.reduce((s, d) => s + d.submitted, 0);

  // Members who haven't submitted today
  const todayData = dailyData[dailyData.length - 1];
  const todaySubmitted = todayData?.submitted ?? 0;
  const notSubmittedToday = totalMembers - todaySubmitted;

  // Format date for chart
  const chartData = dailyData.map((d) => ({
    ...d,
    dateLabel: d.date.slice(5), // MM-DD
  }));

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-[var(--text-secondary)]">直近7日の平均提出率</p>
            <p className="mt-1 text-2xl font-bold text-[var(--text-primary)]">
              {avgRate7d}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-[var(--text-secondary)]">過去30日の総提出数</p>
            <p className="mt-1 text-2xl font-bold text-[var(--text-primary)]">
              {totalSubmissions}件
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-[var(--text-secondary)]">本日の未提出者</p>
            <p className="mt-1 text-2xl font-bold text-[var(--text-primary)]">
              {notSubmittedToday > 0 ? (
                <span className="text-amber-500">{notSubmittedToday}人</span>
              ) : (
                <span className="text-[var(--success)]">全員提出済み</span>
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Submission rate chart */}
      <Card>
        <CardHeader>
          <CardTitle>日別提出率（過去30日）</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
                <XAxis
                  dataKey="dateLabel"
                  tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                  domain={[0, 100]}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--bg-card)",
                    border: "1px solid var(--border-primary)",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                  formatter={(value) => [`${value}%`, "提出率"]}
                />
                <Line
                  type="monotone"
                  dataKey="rate"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Member submission ranking */}
      <Card>
        <CardHeader>
          <CardTitle>メンバー別提出状況（過去30日）</CardTitle>
        </CardHeader>
        <CardContent>
          {memberDetails.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">データがありません</p>
          ) : (
            <div className="space-y-3">
              {memberDetails.map((member) => {
                const maxPossible = dailyData.length;
                const percentage =
                  maxPossible > 0
                    ? Math.round((member.count / maxPossible) * 100)
                    : 0;

                return (
                  <div key={member.userId} className="flex items-center gap-3">
                    <span className="w-32 truncate text-sm font-medium text-[var(--text-primary)]">
                      {member.name}
                    </span>
                    <div className="flex-1">
                      <div className="h-2 overflow-hidden rounded-full bg-[var(--bg-hover)]">
                        <div
                          className={`h-full rounded-full transition-all ${
                            percentage >= 80
                              ? "bg-[var(--success)]"
                              : percentage >= 50
                              ? "bg-amber-500"
                              : "bg-[var(--danger)]"
                          }`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                    <span className="w-20 text-right text-xs text-[var(--text-muted)]">
                      {member.count}/{maxPossible}日 ({percentage}%)
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
