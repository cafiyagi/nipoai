import type { Plan } from "@/lib/supabase/types";

// ---------------------------------------------------------------------------
// Plan definitions
// ---------------------------------------------------------------------------

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
  limits: {
    /** Maximum number of workspace members. */
    maxMembers: number;
    /** Maximum number of daily reports stored (rolling window). */
    maxReportsHistory: number;
    /** Whether AI-powered report generation is available. */
    aiGeneration: boolean;
    /** Whether Slack integration is available. */
    slackIntegration: boolean;
    /** Whether email delivery is available. */
    emailDelivery: boolean;
    /** Number of Slack channels reports can be delivered to. */
    maxSlackChannels: number;
  };
}

export const PLANS: Record<Plan, PlanDefinition> = {
  free: {
    id: "free",
    name: "Free",
    price: 0,
    features: [
      "メンバー3名まで",
      "直近7日分のレポート保存",
      "手動レポート作成",
    ],
    limits: {
      maxMembers: 3,
      maxReportsHistory: 7,
      aiGeneration: false,
      slackIntegration: false,
      emailDelivery: false,
      maxSlackChannels: 0,
    },
  },
  starter: {
    id: "starter",
    name: "Starter",
    price: 1980,
    features: [
      "メンバー10名まで",
      "直近90日分のレポート保存",
      "AI日報生成",
      "Slack連携（1チャンネル）",
      "メール配信",
    ],
    limits: {
      maxMembers: 10,
      maxReportsHistory: 90,
      aiGeneration: true,
      slackIntegration: true,
      emailDelivery: true,
      maxSlackChannels: 1,
    },
  },
  team: {
    id: "team",
    name: "Team",
    price: 4980,
    features: [
      "メンバー無制限",
      "無制限のレポート保存",
      "AI日報生成",
      "Slack連携（無制限チャンネル）",
      "メール配信",
      "カスタムレポートテンプレート",
      "優先サポート",
    ],
    limits: {
      maxMembers: Infinity,
      maxReportsHistory: Infinity,
      aiGeneration: true,
      slackIntegration: true,
      emailDelivery: true,
      maxSlackChannels: Infinity,
    },
  },
} as const;

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
