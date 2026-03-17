"use client";

import { useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import type { Workspace, Plan } from "@/lib/supabase/types";
import { checkPlanFeature } from "@/lib/plan-gate";

interface ReminderSettingsProps {
  workspace: Workspace;
  isAdmin: boolean;
  plan: Plan;
}

const TIME_OPTIONS = [
  "09:00", "09:30", "10:00", "10:30",
  "11:00", "11:30", "12:00", "12:30",
  "13:00", "13:30", "14:00", "14:30",
  "15:00", "15:30", "16:00", "16:30",
  "17:00", "17:30", "18:00", "18:30",
  "19:00", "19:30", "20:00", "20:30",
  "21:00",
];

export function ReminderSettings({ workspace, isAdmin, plan }: ReminderSettingsProps) {
  const { toast } = useToast();
  const hasFeature = checkPlanFeature(plan, "autoReminder");

  const [enabled, setEnabled] = useState(workspace.reminder_enabled);
  const [time, setTime] = useState(workspace.reminder_time?.slice(0, 5) ?? "18:00");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAdmin) {
      toast("管理者のみ設定を変更できます", "error");
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch("/api/settings/reminder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reminder_enabled: enabled,
          reminder_time: time,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast(data.error ?? "設定の保存に失敗しました", "error");
        return;
      }

      toast("リマインド設定を保存しました", "success");
    } catch {
      toast("設定の保存に失敗しました", "error");
    } finally {
      setIsSaving(false);
    }
  };

  if (!hasFeature) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-[var(--text-muted)]" />
            <CardTitle>未提出リマインド</CardTitle>
          </div>
          <CardDescription>
            日報を提出していないメンバーに自動でリマインドを送信します。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-[var(--accent)]/30 bg-[var(--accent-bg)] p-4">
            <p className="text-sm font-medium text-[var(--accent)]">
              Starter プラン以上で利用可能
            </p>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              未提出リマインド機能を使うには、プランをアップグレードしてください。
            </p>
            <a
              href="/dashboard/settings?tab=billing"
              className="mt-3 inline-block text-sm font-medium text-[var(--accent)] underline underline-offset-2 hover:opacity-80"
            >
              プランを確認する
            </a>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-[var(--text-muted)]" />
          <CardTitle>未提出リマインド</CardTitle>
        </div>
        <CardDescription>
          日報を提出していないメンバーに自動でSlack DMを送信します。
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!isAdmin && (
          <div className="mb-4 rounded-lg border border-[var(--accent)]/30 bg-[var(--accent-bg)] p-3">
            <p className="text-sm text-[var(--accent)]">
              この設定は管理者のみ変更できます。
            </p>
          </div>
        )}
        <form onSubmit={handleSave} className="flex flex-col gap-5">
          {/* ON/OFF Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">
                自動リマインド
              </p>
              <p className="mt-0.5 text-sm text-[var(--text-secondary)]">
                毎日指定した時刻にリマインドを送信
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={enabled}
              disabled={!isAdmin}
              onClick={() => setEnabled(!enabled)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
                enabled
                  ? "bg-[var(--accent)]"
                  : "bg-[var(--border-secondary)]"
              }`}
            >
              <span
                className={`pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform ${
                  enabled ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Time selector */}
          <div>
            <label
              htmlFor="reminder-time"
              className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]"
            >
              リマインド時刻
            </label>
            <select
              id="reminder-time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              disabled={!isAdmin || !enabled}
              className="w-full rounded-lg border border-[var(--border-primary)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)] transition-colors focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {TIME_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-xs text-[var(--text-muted)]">
              ワークスペースのタイムゾーン（{workspace.timezone}）で送信されます
            </p>
          </div>

          {isAdmin && (
            <div className="flex justify-end">
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "保存中..." : "保存"}
              </Button>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
