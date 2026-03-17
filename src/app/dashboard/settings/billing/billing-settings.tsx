"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  CreditCard,
  ExternalLink,
  Check,
  X,
  Users,
  FileText,
  Zap,
  ChevronDown,
  ChevronUp,
  Crown,
  Sparkles,
  Shield,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { PLANS } from "@/lib/constants";
import type { Workspace, Subscription, Plan } from "@/lib/supabase/types";

/* -------------------------------------------------------------------------- */
/*  Constants derived from PLANS                                               */
/* -------------------------------------------------------------------------- */

const PLAN_LABELS: Record<Plan, string> = {
  free: PLANS.free.name,
  starter: PLANS.starter.name,
  team: PLANS.team.name,
};

const PLAN_DESCRIPTIONS: Record<Plan, string> = {
  free: "まずは無料で試してみましょう",
  starter: "成長中のチームに最適",
  team: "本格的な組織運用に",
};

const PLAN_ICONS: Record<Plan, typeof Zap> = {
  free: Zap,
  starter: Crown,
  team: Shield,
};

const PLAN_PRICES_MONTHLY: Record<Plan, number> = {
  free: PLANS.free.price,
  starter: PLANS.starter.price,
  team: PLANS.team.price,
};

const PLAN_PRICES_ANNUAL: Record<Plan, number> = {
  free: 0,
  starter: Math.round(PLANS.starter.price * 0.8),
  team: Math.round(PLANS.team.price * 0.8),
};

const PLAN_MEMBER_LIMITS: Record<Plan, number> = {
  free: PLANS.free.limits.maxMembers,
  starter: PLANS.starter.limits.maxMembers,
  team: PLANS.team.limits.maxMembers,
};

const PLAN_REPORT_LIMITS: Record<Plan, number> = {
  free: PLANS.free.limits.maxReportsPerMonth,
  starter: PLANS.starter.limits.maxReportsPerMonth,
  team: PLANS.team.limits.maxReportsPerMonth,
};

const PLAN_ORDER: Plan[] = ["free", "starter", "team"];

function formatLimit(val: number): string {
  return val === Infinity ? "無制限" : `${val}`;
}

function formatDays(val: number): string {
  if (val === Infinity) return "無制限";
  return `${val}日間`;
}

/* Features that are actually implemented */
type FeatureStatus = "live" | "coming_soon";

interface PlanFeature {
  label: string;
  status: FeatureStatus;
  free: string | boolean;
  starter: string | boolean;
  team: string | boolean;
}

const PLAN_FEATURES: PlanFeature[] = [
  {
    label: "メンバー数",
    status: "live",
    free: `最大${PLANS.free.limits.maxMembers}名`,
    starter: `最大${PLANS.starter.limits.maxMembers}名`,
    team: `最大${PLANS.team.limits.maxMembers}名`,
  },
  {
    label: "月間AI日報生成数",
    status: "live",
    free: `${PLANS.free.limits.maxReportsPerMonth}回`,
    starter: "無制限",
    team: "無制限",
  },
  {
    label: "データ保持期間",
    status: "live",
    free: formatDays(PLANS.free.limits.retentionDays),
    starter: formatDays(PLANS.starter.limits.retentionDays),
    team: formatDays(PLANS.team.limits.retentionDays),
  },
  {
    label: "ウォーターマーク",
    status: "live",
    free: "あり",
    starter: "なし",
    team: "なし",
  },
  {
    label: "Slack連携",
    status: "live",
    free: false,
    starter: true,
    team: true,
  },
  {
    label: "テンプレートカスタマイズ",
    status: "live",
    free: false,
    starter: true,
    team: true,
  },
  {
    label: "週報生成",
    status: "live",
    free: false,
    starter: true,
    team: true,
  },
  {
    label: "CSVエクスポート",
    status: "coming_soon",
    free: false,
    starter: true,
    team: true,
  },
  {
    label: "管理者ダッシュボード",
    status: "live",
    free: false,
    starter: false,
    team: true,
  },
  {
    label: "優先サポート",
    status: "live",
    free: false,
    starter: false,
    team: true,
  },
];

const FEATURE_HIGHLIGHTS: Record<Plan, string[]> = {
  free: [
    `最大${PLANS.free.limits.maxMembers}名まで利用可能`,
    `月${PLANS.free.limits.maxReportsPerMonth}回のAI日報生成`,
    `${PLANS.free.limits.retentionDays}日間のデータ保持`,
  ],
  starter: [
    `最大${PLANS.starter.limits.maxMembers}名まで利用可能`,
    "無制限のAI日報生成",
    `${PLANS.starter.limits.retentionDays}日間のデータ保持`,
    "週報の自動生成",
    "Slack連携",
    "テンプレートカスタマイズ",
  ],
  team: [
    `最大${PLANS.team.limits.maxMembers}名まで利用可能`,
    "無制限のAI日報生成",
    "無制限のデータ保持",
    "管理者ダッシュボード",
    "優先サポート",
  ],
};

interface FaqItem {
  question: string;
  answer: string;
}

const FAQ_ITEMS: FaqItem[] = [
  {
    question: "プランはいつでも変更できますか？",
    answer:
      "はい、いつでもアップグレード・ダウングレードが可能です。アップグレードの場合は即座に反映され、日割り計算で差額が請求されます。ダウングレードは次回の請求日から適用されます。",
  },
  {
    question: "年額プランの途中解約はできますか？",
    answer:
      "年額プランの途中解約も可能です。残りの期間分は日割りでご返金いたします。解約後も契約期間終了まではサービスをご利用いただけます。",
  },
  {
    question: "支払い方法は何が使えますか？",
    answer:
      "クレジットカード（Visa、Mastercard、American Express、JCB）に対応しています。請求書払いをご希望の場合はお問い合わせください。",
  },
  {
    question: "無料プランに制限はありますか？",
    answer: `無料プランでは月${PLANS.free.limits.maxReportsPerMonth}回までのAI日報生成、最大${PLANS.free.limits.maxMembers}名のメンバー、${PLANS.free.limits.retentionDays}日間のデータ保持となります。生成された日報にはウォーターマークが付きます。`,
  },
  {
    question: "メンバー数の上限を超えたい場合は？",
    answer: `Teamプラン（${PLANS.team.limits.maxMembers}名まで）を超える場合は、カスタムプランをご用意できます。お問い合わせフォームよりご連絡ください。`,
  },
];

/* -------------------------------------------------------------------------- */
/*  Props                                                                      */
/* -------------------------------------------------------------------------- */

interface BillingSettingsProps {
  workspace: Workspace;
  subscription: Pick<
    Subscription,
    "id" | "plan" | "status" | "current_period_end"
  > | null;
  memberCount: number;
  reportCount: number;
  slackConnected: boolean;
  isAdmin: boolean;
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                  */
/* -------------------------------------------------------------------------- */

export function BillingSettings({
  workspace,
  subscription,
  memberCount,
  reportCount,
  slackConnected,
  isAdmin,
}: BillingSettingsProps) {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [checkoutLoadingPlan, setCheckoutLoadingPlan] = useState<string | null>(null);
  const [isPortalLoading, setIsPortalLoading] = useState(false);
  const [billingInterval, setBillingInterval] = useState<"monthly" | "annual">(
    "monthly"
  );
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  /* Checkout result toast ---------------------------------------------------*/
  useEffect(() => {
    const checkoutStatus = searchParams.get("checkout");
    if (checkoutStatus === "success") {
      toast("プランのアップグレードが完了しました", "success");
      router.replace("/dashboard/settings/billing", { scroll: false });
    } else if (checkoutStatus === "canceled") {
      toast("チェックアウトがキャンセルされました", "info");
      router.replace("/dashboard/settings/billing", { scroll: false });
    }
  }, [searchParams, toast, router]);

  /* Derived state -----------------------------------------------------------*/
  const currentPlan = workspace.plan;
  const memberLimit = PLAN_MEMBER_LIMITS[currentPlan];
  const reportLimit = PLAN_REPORT_LIMITS[currentPlan];
  const memberPercent = Math.min(
    100,
    memberLimit === Infinity ? 0 : (memberCount / memberLimit) * 100
  );
  const reportPercent = Math.min(
    100,
    reportLimit === Infinity ? 0 : (reportCount / reportLimit) * 100
  );

  /* Helpers -----------------------------------------------------------------*/
  const subscriptionStatusLabel = (
    status: string | undefined
  ): { label: string; variant: "success" | "destructive" | "secondary" } => {
    switch (status) {
      case "active":
        return { label: "有効", variant: "success" };
      case "trialing":
        return { label: "トライアル", variant: "success" };
      case "past_due":
        return { label: "支払い遅延", variant: "destructive" };
      case "canceled":
        return { label: "キャンセル済み", variant: "secondary" };
      default:
        return { label: "有効", variant: "success" };
    }
  };

  const subStatus = subscriptionStatusLabel(subscription?.status);

  const formatDate = (dateStr: string | null | undefined): string => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
  };

  const formatPrice = (price: number): string => {
    if (price === 0) return "¥0";
    return `¥${price.toLocaleString()}`;
  };

  const getPlanPrice = (plan: Plan): number => {
    return billingInterval === "monthly"
      ? PLAN_PRICES_MONTHLY[plan]
      : PLAN_PRICES_ANNUAL[plan];
  };

  const canUpgradeTo = (plan: Plan): boolean => {
    const currentIdx = PLAN_ORDER.indexOf(currentPlan);
    const targetIdx = PLAN_ORDER.indexOf(plan);
    return targetIdx > currentIdx;
  };

  /* Handlers ----------------------------------------------------------------*/
  const handleUpgrade = async (plan: "starter" | "team") => {
    if (!isAdmin) {
      toast("管理者のみプランを変更できます", "error");
      return;
    }

    setCheckoutLoadingPlan(plan);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan,
          workspace_id: workspace.id,
          interval: billingInterval === "annual" ? "year" : "month",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast(data.error ?? "チェックアウトの作成に失敗しました", "error");
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      toast("チェックアウトの作成に失敗しました", "error");
    } finally {
      setCheckoutLoadingPlan(null);
    }
  };

  const handleBillingPortal = async () => {
    if (!isAdmin) {
      toast("管理者のみ請求管理にアクセスできます", "error");
      return;
    }

    setIsPortalLoading(true);
    try {
      const res = await fetch("/api/billing/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspace_id: workspace.id,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast(data.error ?? "請求ポータルの作成に失敗しました", "error");
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      toast("請求ポータルの作成に失敗しました", "error");
    } finally {
      setIsPortalLoading(false);
    }
  };

  /* ========================================================================= */
  /*  Render                                                                    */
  /* ========================================================================= */

  return (
    <div className="space-y-8">
      {/* ------------------------------------------------------------------ */}
      {/*  Section 1 : Pricing Cards                                          */}
      {/* ------------------------------------------------------------------ */}
      <div>
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">
            プランを選択
          </h2>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            チームの規模に合わせて最適なプランをお選びください。
          </p>

          {/* Billing interval toggle */}
          <div className="mt-5 inline-flex items-center rounded-full border border-[var(--border-primary)] bg-[var(--bg-hover)] p-1">
            <button
              type="button"
              onClick={() => setBillingInterval("monthly")}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                billingInterval === "monthly"
                  ? "bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              月額
            </button>
            <button
              type="button"
              onClick={() => setBillingInterval("annual")}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                billingInterval === "annual"
                  ? "bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              年額
              <span className="ml-1.5 inline-flex items-center rounded-full bg-[var(--success-bg)] px-2 py-0.5 text-xs font-medium text-[var(--success)]">
                20%OFF
              </span>
            </button>
          </div>
        </div>

        {/* Pricing cards grid */}
        <div className="grid gap-5 lg:grid-cols-3">
          {PLAN_ORDER.map((plan) => {
            const isCurrentPlan = currentPlan === plan;
            const isRecommended = plan === "starter";
            const PlanIcon = PLAN_ICONS[plan];
            const price = getPlanPrice(plan);

            return (
              <Card
                key={plan}
                className={`relative flex flex-col transition-shadow ${
                  isRecommended
                    ? "border-[var(--accent)] shadow-md ring-1 ring-[var(--accent)]"
                    : ""
                } ${isCurrentPlan ? "border-[var(--success)] bg-[var(--success-bg)]" : ""}`}
              >
                {/* Recommended badge */}
                {isRecommended && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white shadow-sm">
                      <Sparkles className="h-3 w-3" />
                      おすすめ
                    </span>
                  </div>
                )}

                <CardHeader className={isRecommended ? "pt-8" : ""}>
                  <div className="flex items-center gap-2">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                        isRecommended
                          ? "bg-[var(--accent-bg)]"
                          : plan === "team"
                          ? "bg-purple-500/10"
                          : "bg-[var(--bg-hover)]"
                      }`}
                    >
                      <PlanIcon
                        className={`h-4 w-4 ${
                          isRecommended
                            ? "text-[var(--accent)]"
                            : plan === "team"
                            ? "text-purple-400"
                            : "text-[var(--text-secondary)]"
                        }`}
                      />
                    </div>
                    <div>
                      <CardTitle className="text-base">
                        {PLAN_LABELS[plan]}
                      </CardTitle>
                    </div>
                    {isCurrentPlan && (
                      <Badge variant="success" className="ml-auto">
                        利用中
                      </Badge>
                    )}
                  </div>
                  <CardDescription className="mt-1">
                    {PLAN_DESCRIPTIONS[plan]}
                  </CardDescription>

                  {/* Price */}
                  <div className="mt-4">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-[var(--text-primary)]">
                        {formatPrice(price)}
                      </span>
                      {price > 0 && (
                        <span className="text-sm text-[var(--text-secondary)]">/ 月</span>
                      )}
                    </div>
                    {price > 0 && billingInterval === "annual" && (
                      <p className="mt-1 text-xs text-[var(--text-muted)]">
                        <span className="line-through">
                          {formatPrice(PLAN_PRICES_MONTHLY[plan])}
                        </span>
                        <span className="ml-1 text-[var(--success)] font-medium">
                          年額{formatPrice(price * 12)}/年で20%お得
                        </span>
                      </p>
                    )}
                    {price === 0 && (
                      <p className="mt-1 text-xs text-[var(--text-muted)]">
                        クレジットカード不要
                      </p>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="flex flex-1 flex-col">
                  {/* Feature list */}
                  <ul className="flex-1 space-y-2.5">
                    {FEATURE_HIGHLIGHTS[plan].map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <Check
                          className={`mt-0.5 h-4 w-4 flex-shrink-0 ${
                            isRecommended
                              ? "text-[var(--accent)]"
                              : plan === "team"
                              ? "text-purple-400"
                              : "text-[var(--text-muted)]"
                          }`}
                        />
                        <span className="text-sm text-[var(--text-secondary)]">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA button */}
                  <div className="mt-6">
                    {isCurrentPlan ? (
                      <Button
                        variant="outline"
                        size="md"
                        className="w-full cursor-default border-[var(--success)] bg-[var(--success-bg)] text-[var(--success)] hover:bg-[var(--success-bg)]"
                        disabled
                      >
                        <Check className="mr-1.5 h-4 w-4" />
                        現在のプラン
                      </Button>
                    ) : canUpgradeTo(plan) ? (
                      <Button
                        variant="default"
                        size="md"
                        className={`w-full ${
                          isRecommended
                            ? "bg-blue-600 hover:bg-blue-700 shadow-sm"
                            : plan === "team"
                            ? "bg-purple-600 hover:bg-purple-700 shadow-sm"
                            : ""
                        }`}
                        disabled={checkoutLoadingPlan !== null || !isAdmin}
                        onClick={() =>
                          handleUpgrade(plan as "starter" | "team")
                        }
                      >
                        {checkoutLoadingPlan === plan
                          ? "処理中..."
                          : `${PLAN_LABELS[plan]}にアップグレード`}
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="md"
                        className="w-full"
                        disabled
                      >
                        現在より下位のプラン
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Social proof */}
        <div className="mt-6 text-center">
          <p className="text-sm text-[var(--text-muted)]">
            チームの規模に合わせて最適なプランをお選びください
          </p>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/*  Section 3 : Feature Comparison Table                               */}
      {/* ------------------------------------------------------------------ */}
      <Card>
        <CardHeader>
          <CardTitle>機能比較表</CardTitle>
          <CardDescription>
            各プランの詳細な機能比較をご確認いただけます。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border-primary)]">
                  <th className="py-3 pr-4 text-left font-medium text-[var(--text-secondary)]">
                    機能
                  </th>
                  {PLAN_ORDER.map((plan) => (
                    <th
                      key={plan}
                      className={`px-4 py-3 text-center font-semibold ${
                        plan === "starter"
                          ? "text-[var(--accent)]"
                          : plan === "team"
                          ? "text-purple-400"
                          : "text-[var(--text-primary)]"
                      }`}
                    >
                      <div className="flex flex-col items-center gap-1">
                        <span>{PLAN_LABELS[plan]}</span>
                        {currentPlan === plan && (
                          <Badge variant="success" className="text-[10px]">
                            利用中
                          </Badge>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PLAN_FEATURES.map((feature, idx) => (
                  <tr
                    key={feature.label}
                    className={
                      idx % 2 === 0 ? "bg-[var(--bg-hover)]/50" : "bg-[var(--bg-card)]"
                    }
                  >
                    <td className="py-3 pr-4 text-[var(--text-primary)] font-medium">
                      <span className="flex items-center gap-1.5">
                        {feature.label}
                        {feature.status === "coming_soon" && (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-500">
                            <Clock className="h-2.5 w-2.5" />
                            近日公開
                          </span>
                        )}
                      </span>
                    </td>
                    {(["free", "starter", "team"] as const).map((plan) => {
                      const val = feature[plan];
                      return (
                        <td key={plan} className="px-4 py-3 text-center">
                          {typeof val === "boolean" ? (
                            val ? (
                              <Check className="mx-auto h-4 w-4 text-[var(--success)]" />
                            ) : (
                              <X className="mx-auto h-4 w-4 text-[var(--text-muted)]" />
                            )
                          ) : (
                            <span className="text-[var(--text-secondary)]">{val}</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ------------------------------------------------------------------ */}
      {/*  Section 4 : FAQ                                                    */}
      {/* ------------------------------------------------------------------ */}
      <Card>
        <CardHeader>
          <CardTitle>よくあるご質問</CardTitle>
          <CardDescription>
            料金・お支払いに関するよくあるご質問をまとめました。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-[var(--border-primary)]">
            {FAQ_ITEMS.map((item, idx) => (
              <div key={idx}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between py-4 text-left transition-colors hover:text-[var(--accent)]"
                  onClick={() =>
                    setExpandedFaq(expandedFaq === idx ? null : idx)
                  }
                  aria-expanded={expandedFaq === idx}
                >
                  <span className="pr-4 text-sm font-medium text-[var(--text-primary)]">
                    {item.question}
                  </span>
                  {expandedFaq === idx ? (
                    <ChevronUp className="h-4 w-4 flex-shrink-0 text-[var(--text-muted)]" />
                  ) : (
                    <ChevronDown className="h-4 w-4 flex-shrink-0 text-[var(--text-muted)]" />
                  )}
                </button>
                {expandedFaq === idx && (
                  <p className="pb-4 text-sm leading-relaxed text-[var(--text-secondary)]">
                    {item.answer}
                  </p>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ------------------------------------------------------------------ */}
      {/*  Bottom CTA for free users                                          */}
      {/* ------------------------------------------------------------------ */}
      {currentPlan === "free" && isAdmin && (
        <div className="relative overflow-hidden rounded-xl border border-blue-200 bg-gradient-to-r from-blue-600 to-blue-700 p-8 text-white">
          {/* Background decoration */}
          <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-blue-500/30" />
          <div className="absolute -bottom-6 -left-6 h-32 w-32 rounded-full bg-blue-500/20" />

          <div className="relative flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-bold">
                まだFreeプランをお使いですか？
              </h3>
              <p className="mt-1 text-sm text-blue-100">
                Starterプランなら無制限の日報生成、週報対応、Slack連携が月額¥{PLANS.starter.price}で使えます。
                {billingInterval === "annual" && (
                  <span className="font-medium text-white">
                    {" "}年額なら月¥{PLAN_PRICES_ANNUAL.starter} — 20%もお得です。
                  </span>
                )}
              </p>
            </div>
            <Button
              variant="outline"
              size="lg"
              className="flex-shrink-0 border-white/30 bg-white text-blue-600 hover:bg-blue-50"
              disabled={checkoutLoadingPlan !== null}
              onClick={() => handleUpgrade("starter")}
            >
              {checkoutLoadingPlan === "starter" ? "処理中..." : "Starterにアップグレード"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
