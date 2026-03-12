"use client";

import { useState } from "react";
import {
  Settings,
  CreditCard,
  MessageSquare,
  FileText,
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
import { AccountSettings } from "./account/account-settings";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TabId = "hub" | "general" | "billing" | "slack" | "template" | "account";

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
    iconBg: "bg-gray-100 text-gray-500",
    iconHoverBg: "group-hover:bg-blue-50 group-hover:text-blue-600",
    adminOnly: false,
  },
  {
    id: "billing",
    label: "プランと請求",
    description: "プランの管理、利用状況の確認",
    icon: CreditCard,
    iconBg: "bg-gray-100 text-gray-500",
    iconHoverBg: "group-hover:bg-blue-50 group-hover:text-blue-600",
    adminOnly: false,
  },
  {
    id: "slack",
    label: "Slack連携",
    description: "Slackワークスペースとの連携管理",
    icon: MessageSquare,
    iconBg: "bg-gray-100 text-gray-500",
    iconHoverBg: "group-hover:bg-blue-50 group-hover:text-blue-600",
    adminOnly: false,
  },
  {
    id: "template",
    label: "日報テンプレート",
    description: "日報のセクション構成をカスタマイズ",
    icon: FileText,
    iconBg: "bg-gray-100 text-gray-500",
    iconHoverBg: "group-hover:bg-blue-50 group-hover:text-blue-600",
    adminOnly: true,
  },
  {
    id: "account",
    label: "アカウント",
    description: "アカウント削除などの操作",
    icon: ShieldAlert,
    iconBg: "bg-amber-50 text-amber-600",
    iconHoverBg: "group-hover:bg-amber-100 group-hover:text-amber-700",
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
}: SettingsTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>("hub");

  const currentPlan = subscription?.plan ?? workspace.plan;

  // ---------- Badge for each category ----------
  const getBadge = (id: TabId) => {
    switch (id) {
      case "general":
        return <span className="shrink-0 text-xs text-gray-400">{workspace.name}</span>;
      case "billing":
        return <Badge variant="secondary">{PLAN_LABELS[currentPlan] ?? currentPlan}</Badge>;
      case "slack":
        return slackIntegration
          ? <Badge variant="success">連携済み</Badge>
          : <Badge variant="secondary">未連携</Badge>;
      case "template":
        return <span className="shrink-0 text-xs text-gray-400">{template.length}セクション</span>;
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
              className={`group flex w-full items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 text-left transition-colors hover:border-gray-300 hover:bg-gray-50 ${cat.separated ? "mt-6" : ""}`}
            >
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors ${cat.iconBg} ${cat.iconHoverBg}`}>
                <cat.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-900">{cat.label}</p>
                <p className="mt-0.5 text-sm text-gray-500">{cat.description}</p>
              </div>
              {getBadge(cat.id)}
              <svg className="h-5 w-5 shrink-0 text-gray-300 transition-colors group-hover:text-gray-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
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
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" />
        設定に戻る
      </button>

      {activeCategory && (
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
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

      {activeTab === "account" && isAdmin && (
        <AccountSettings
          workspace={workspace}
          memberCount={memberCount}
        />
      )}
    </div>
  );
}
