"use client";

import { useState } from "react";
import {
  Settings,
  CreditCard,
  MessageSquare,
  FileText,
  Bell,
  ShieldAlert,
  ArrowLeft,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Workspace, SlackIntegration, Subscription } from "@/lib/supabase/types";
import type { ReportTemplate } from "@/lib/report-template";

import { GeneralSettings } from "./general/general-settings";
import { BillingSettings } from "./billing/billing-settings";
import { SlackSettings } from "./slack/slack-settings";
import { TemplateEditor } from "./template/template-editor";
import { ReminderSettings } from "./reminder/reminder-settings";
import { AccountSettings } from "./account/account-settings";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TabId = "hub" | "general" | "billing" | "slack" | "template" | "reminder" | "account";

interface SettingsTabsProps {
  workspace: Workspace;
  isAdmin: boolean;
  slackIntegration: Pick<
    SlackIntegration,
    "id" | "slack_team_name" | "selected_channel_ids"
  > | null;
  subscription: Pick<
    Subscription,
    "id" | "plan" | "status" | "current_period_end"
  > | null;
  memberCount: number;
  reportCount: number;
  template: ReportTemplate;
  initialTab?: TabId;
}

// ---------------------------------------------------------------------------
// Hub category config
// ---------------------------------------------------------------------------

const PLAN_LABELS: Record<string, string> = {
  free: "Free",
  starter: "Starter",
  team: "Team",
};

interface CategoryItem {
  id: TabId;
  label: string;
  description: string;
  icon: typeof Settings;
  iconBg: string;
  iconHoverBg: string;
  adminOnly: boolean;
  separated?: boolean;
}

const categories: CategoryItem[] = [
  {
    id: "general",
    label: "一般設定",
    description: "ワークスペース名の変更",
    icon: Settings,
    iconBg: "bg-[var(--icon-bg-gray)] text-[var(--icon-text-gray)]",
    iconHoverBg: "group-hover:bg-[var(--accent-bg)] group-hover:text-[var(--accent)]",
    adminOnly: false,
  },
  {
    id: "billing",
    label: "プランと請求",
    description: "プランの管理、利用状況の確認",
    icon: CreditCard,
    iconBg: "bg-[var(--icon-bg-gray)] text-[var(--icon-text-gray)]",
    iconHoverBg: "group-hover:bg-[var(--accent-bg)] group-hover:text-[var(--accent)]",
    adminOnly: false,
  },
  {
    id: "slack",
    label: "Slack連携",
    description: "Slackワークスペースとの連携管理",
    icon: MessageSquare,
    iconBg: "bg-[var(--icon-bg-gray)] text-[var(--icon-text-gray)]",
    iconHoverBg: "group-hover:bg-[var(--accent-bg)] group-hover:text-[var(--accent)]",
    adminOnly: false,
  },
  {
    id: "template",
    label: "日報テンプレート",
    description: "日報のセクション構成をカスタマイズ",
    icon: FileText,
    iconBg: "bg-[var(--icon-bg-gray)] text-[var(--icon-text-gray)]",
    iconHoverBg: "group-hover:bg-[var(--accent-bg)] group-hover:text-[var(--accent)]",
    adminOnly: true,
  },
  {
    id: "reminder",
    label: "未提出リマインド",
    description: "未提出メンバーへの自動リマインド設定",
    icon: Bell,
    iconBg: "bg-[var(--icon-bg-gray)] text-[var(--icon-text-gray)]",
    iconHoverBg: "group-hover:bg-[var(--accent-bg)] group-hover:text-[var(--accent)]",
    adminOnly: true,
  },
  {
    id: "account",
    label: "アカウント",
    description: "アカウント削除などの操作",
    icon: ShieldAlert,
    iconBg: "bg-[var(--icon-bg-amber)] text-[var(--icon-text-amber)]",
    iconHoverBg: "group-hover:bg-[var(--icon-bg-amber)] group-hover:text-[var(--icon-text-amber)]",
    adminOnly: true,
    separated: true,
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SettingsTabs({
  workspace,
  isAdmin,
  slackIntegration,
  subscription,
  memberCount,
  reportCount,
  template,
  initialTab,
}: SettingsTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>(initialTab ?? "hub");

  const currentPlan = subscription?.plan ?? workspace.plan;

  // ---------- Badge for each category ----------
  const getBadge = (id: TabId) => {
    switch (id) {
      case "general":
        return <span className="shrink-0 text-xs text-[var(--text-muted)]">{workspace.name}</span>;
      case "billing":
        return <Badge variant="secondary">{PLAN_LABELS[currentPlan] ?? currentPlan}</Badge>;
      case "slack":
        return slackIntegration
          ? <Badge variant="success">連携済み</Badge>
          : <Badge variant="secondary">未連携</Badge>;
      case "template":
        return <span className="shrink-0 text-xs text-[var(--text-muted)]">{template.length}セクション</span>;
      case "reminder":
        return workspace.reminder_enabled
          ? <Badge variant="success">ON</Badge>
          : <Badge variant="secondary">OFF</Badge>;
      default:
        return null;
    }
  };

  // ---------- Hub view ----------
  if (activeTab === "hub") {
    return (
      <div className="mx-auto max-w-2xl flex flex-col gap-3">
        {categories
          .filter((cat) => !cat.adminOnly || isAdmin)
          .map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveTab(cat.id)}
              className={`group flex w-full items-center gap-4 rounded-xl border border-[var(--border-primary)] bg-[var(--bg-card)] p-4 text-left transition-colors hover:border-[var(--border-secondary)] hover:bg-[var(--bg-hover)] ${cat.separated ? "mt-6" : ""}`}
            >
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors ${cat.iconBg} ${cat.iconHoverBg}`}>
                <cat.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-[var(--text-primary)]">{cat.label}</p>
                <p className="mt-0.5 text-sm text-[var(--text-secondary)]">{cat.description}</p>
              </div>
              {getBadge(cat.id)}
              <svg className="h-5 w-5 shrink-0 text-[var(--text-muted)] transition-colors group-hover:text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          ))}
      </div>
    );
  }

  // ---------- Sub-page view ----------
  const activeCategory = categories.find((c) => c.id === activeTab);

  return (
    <div>
      <button
        onClick={() => setActiveTab("hub")}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
      >
        <ArrowLeft className="h-4 w-4" />
        設定に戻る
      </button>

      {activeCategory && (
        <h2 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">
          {activeCategory.label}
        </h2>
      )}

      {activeTab === "general" && (
        <GeneralSettings workspace={workspace} isAdmin={isAdmin} />
      )}

      {activeTab === "billing" && (
        <BillingSettings
          workspace={workspace}
          subscription={subscription}
          memberCount={memberCount}
          reportCount={reportCount}
          slackConnected={!!slackIntegration}
          isAdmin={isAdmin}
        />
      )}

      {activeTab === "slack" && (
        <SlackSettings
          workspaceId={workspace.id}
          slackIntegration={slackIntegration}
          isAdmin={isAdmin}
        />
      )}

      {activeTab === "template" && isAdmin && (
        <TemplateEditor
          workspaceId={workspace.id}
          initialTemplate={template}
        />
      )}

      {activeTab === "reminder" && isAdmin && (
        <ReminderSettings
          workspace={workspace}
          isAdmin={isAdmin}
          plan={currentPlan}
        />
      )}

      {activeTab === "account" && isAdmin && (
        <AccountSettings
          workspace={workspace}
          memberCount={memberCount}
        />
      )}
    </div>
  );
}
