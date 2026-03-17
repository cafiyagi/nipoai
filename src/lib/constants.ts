import type { Plan } from "@/lib/supabase/types";

// ---------------------------------------------------------------------------
// Plan definitions — Single Source of Truth
// ---------------------------------------------------------------------------

export interface PlanLimits {
  /** Maximum number of workspace members. */
  maxMembers: number;
  /** Whether AI-powered report generation is available. */
  aiGeneration: boolean;
  /** Maximum AI report generations per month. */
  maxReportsPerMonth: number;
  /** Data retention in days. Infinity = unlimited. */
  retentionDays: number;
  /** Whether Slack integration is available. */
  slackIntegration: boolean;
  /** Whether email delivery is available. */
  emailDelivery: boolean;
  /** Number of Slack channels reports can be delivered to. */
  maxSlackChannels: number;
  /** Whether weekly report generation is available. */
  weeklyReport: boolean;
  /** Whether CSV export is available. */
  csvExport: boolean;
  /** Whether a watermark is shown on reports. */
  watermark: boolean;
  /** Whether the admin analytics dashboard is available. */
  adminDashboard: boolean;
}

export interface PlanDefinition {
  /** Internal identifier — matches the `plan` column in the database. */
  id: Plan;
  /** Human-readable label. */
  name: string;
  /** Monthly price in JPY. 0 for the free tier. */
  price: number;
  /** Bullet-point features shown on the pricing page. */
  features: string[];
  /** Hard limits enforced by the application. */
  limits: PlanLimits;
}

export const PLANS: Record<Plan, PlanDefinition> = {
  free: {
    id: "free",
    name: "Free",
    price: 0,
    features: [
      "メンバー3名まで",
      "月10回のAI日報生成",
      "直近7日分のレポート保存",
      "手動レポート作成",
    ],
    limits: {
      maxMembers: 3,
      maxReportsPerMonth: 10,
      retentionDays: 7,
      aiGeneration: true,
      slackIntegration: false,
      emailDelivery: false,
      maxSlackChannels: 0,
      weeklyReport: false,
      csvExport: false,
      watermark: true,
      adminDashboard: false,
    },
  },
  starter: {
    id: "starter",
    name: "Starter",
    price: 550,
    features: [
      "メンバー10名まで",
      "無制限のAI日報生成",
      "直近90日分のレポート保存",
      "週報の自動生成",
      "Slack連携（1チャンネル）",
      "メール配信",
      "CSVエクスポート",
    ],
    limits: {
      maxMembers: 10,
      maxReportsPerMonth: Infinity,
      retentionDays: 90,
      aiGeneration: true,
      slackIntegration: true,
      emailDelivery: true,
      maxSlackChannels: 1,
      weeklyReport: true,
      csvExport: true,
      watermark: false,
      adminDashboard: false,
    },
  },
  team: {
    id: "team",
    name: "Team",
    price: 1250,
    features: [
      "メンバー30名まで",
      "無制限のAI日報生成",
      "無制限のレポート保存",
      "週報の自動生成",
      "Slack連携（無制限チャンネル）",
      "メール配信",
      "CSVエクスポート",
      "管理者ダッシュボード",
      "優先サポート",
    ],
    limits: {
      maxMembers: 30,
      maxReportsPerMonth: Infinity,
      retentionDays: Infinity,
      aiGeneration: true,
      slackIntegration: true,
      emailDelivery: true,
      maxSlackChannels: Infinity,
      weeklyReport: true,
      csvExport: true,
      watermark: false,
      adminDashboard: true,
    },
  },
} as const;

// ---------------------------------------------------------------------------
// Helper: check if a plan has a specific feature enabled
// ---------------------------------------------------------------------------

export function getPlanLimit<K extends keyof PlanLimits>(
  plan: Plan,
  key: K,
): PlanLimits[K] {
  return PLANS[plan].limits[key];
}

// ---------------------------------------------------------------------------
// Default report sections
// ---------------------------------------------------------------------------

export interface ReportSectionDefinition {
  /** Machine-readable key — matches the keys in `ReportContent`. */
  key: "achievements" | "challenges" | "tomorrow_plan" | "remarks";
  /** Display label shown in the UI. */
  label: string;
  /** Placeholder text for the input field. */
  placeholder: string;
  /** Whether the section is required when submitting a report. */
  required: boolean;
}

export const DEFAULT_REPORT_SECTIONS: ReportSectionDefinition[] = [
  {
    key: "achievements",
    label: "今日の成果",
    placeholder: "今日達成したことを記入してください",
    required: true,
  },
  {
    key: "challenges",
    label: "課題・困りごと",
    placeholder: "直面している課題や困りごとがあれば記入してください",
    required: false,
  },
  {
    key: "tomorrow_plan",
    label: "明日の予定",
    placeholder: "明日取り組む予定のタスクを記入してください",
    required: true,
  },
  {
    key: "remarks",
    label: "備考",
    placeholder: "その他共有事項があれば記入してください",
    required: false,
  },
] as const;
