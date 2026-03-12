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
import type { Workspace, Subscription, Plan } from "@/lib/supabase/types";

/* -------------------------------------------------------------------------- */
/*  Constants                                                                  */
/* -------------------------------------------------------------------------- */

const PLAN_LABELS: Record<Plan, string> = {
  free: "Free",
  starter: "Standard",
  team: "Team",
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
  free: 0,
  starter: 1980,
  team: 4980,
};

const PLAN_PRICES_ANNUAL: Record<Plan, number> = {
  free: 0,
  starter: 1580,
  team: 3980,
};

const PLAN_MEMBER_LIMITS: Record<Plan, number> = {
  free: 3,
  starter: 10,
  team: 30,
};

const PLAN_REPORT_LIMITS: Record<Plan, number> = {
  free: 30,
  starter: Infinity,
  team: Infinity,
};

const PLAN_ORDER: Plan[] = ["free", "starter", "team"];

interface PlanFeature {
  label: string;
  free: string | boolean;
  starter: string | boolean;
  team: string | boolean;
}

const PLAN_FEATURES: PlanFeature[] = [
  { label: "メンバー数", free: "最大3名", starter: "最大10名", team: "最大30名" },
  { label: "月間日報生成数", free: "30回", starter: "無制限", team: "無制限" },
  { label: "データ保持期間", free: "7日間", starter: "90日間", team: "無制限" },
  { label: "ウォーターマーク", free: "あり", starter: "なし", team: "なし" },
  { label: "週報・月報生成", free: false, starter: true, team: true },
  { label: "Slack連携", free: false, starter: true, team: true },
  { label: "テンプレートカスタマイズ", free: false, starter: true, team: true },
  { label: "管理者ダッシュボード", free: false, starter: false, team: true },
  { label: "API連携", free: false, starter: false, team: true },
  { label: "CSV/PDFエクスポート", free: false, starter: true, team: true },
  { label: "優先サポート", free: false, starter: false, team: true },
  { label: "SSO / SAML", free: false, starter: false, team: true },
];

const FEATURE_HIGHLIGHTS: Record<Plan, string[]> = {
  free: [
    "最大3名まで利用可能",
    "月30回のAI日報生成",
    "7日間のデータ保持",
  ],
  starter: [
    "最大10名まで利用可能",
    "無制限のAI日報生成",
    "90日間のデータ保持",
    "週報・月報の自動生成",
    "Slack連携",
    "テンプレートカスタマイズ",
    "CSV/PDFエクスポート",
  ],
  team: [
    "最大30名まで利用可能",
    "無制限のAI日報生成",
    "無制限のデータ保持",
    "管理者ダッシュボード",
    "API連携",
    "優先サポート",
    "SSO / SAML対応",
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
    answer:
      "無料プランでは月30回までの日報生成、最大3名のメンバー、7日間のデータ保持となります。生成された日報にはウォーターマークが付きます。",
  },
  {
    question: "メンバー数の上限を超えたい場合は？",
    answer:
      "Teamプラン（30名まで）を超える場合は、カスタムプランをご用意できます。お問い合わせフォームよりご連絡ください。",
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
          <h2 className="text-2xl font-bold text-gray-900">
            プランを選択
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            チームの規模に合わせて最適なプランをお選びください。
          </p>

          {/* Billing interval toggle */}
          <div className="mt-5 inline-flex items-center rounded-full border border-gray-200 bg-gray-50 p-1">
            <button
              type="button"
              onClick={() => setBillingInterval("monthly")}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                billingInterval === "monthly"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              月額
            </button>
            <button
              type="button"
              onClick={() => setBillingInterval("annual")}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                billingInterval === "annual"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              年額
              <span className="ml-1.5 inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
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
                    ? "border-blue-300 shadow-md ring-1 ring-blue-200"
                    : ""
                } ${isCurrentPlan ? "border-green-300 bg-green-50/30" : ""}`}
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
                          ? "bg-blue-100"
                          : plan === "team"
                          ? "bg-purple-100"
                          : "bg-gray-100"
                      }`}
                    >
                      <PlanIcon
                        className={`h-4 w-4 ${
                          isRecommended
                            ? "text-blue-600"
                            : plan === "team"
                            ? "text-purple-600"
                            : "text-gray-600"
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
                      <span className="text-3xl font-bold text-gray-900">
                        {formatPrice(price)}
                      </span>
                      {price > 0 && (
                        <span className="text-sm text-gray-500">/ 月</span>
                      )}
                    </div>
                    {price > 0 && billingInterval === "annual" && (
                      <p className="mt-1 text-xs text-gray-400">
                        <span className="line-through">
                          {formatPrice(PLAN_PRICES_MONTHLY[plan])}
                        </span>
                        <span className="ml-1 text-green-600 font-medium">
                          年額{formatPrice(price * 12)}/年で20%お得
                        </span>
                      </p>
                    )}
                    {price === 0 && (
                      <p className="mt-1 text-xs text-gray-400">
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
                              ? "text-blue-500"
                              : plan === "team"
                              ? "text-purple-500"
                              : "text-gray-400"
                          }`}
                        />
                        <span className="text-sm text-gray-600">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA button */}
                  <div className="mt-6">
                    {isCurrentPlan ? (
                      <Button
                        variant="outline"
                        size="md"
                        className="w-full cursor-default border-green-300 bg-green-50 text-green-700 hover:bg-green-50"
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
          <p className="text-sm text-gray-400">
            500社以上のチームがNipoAIで日報業務を効率化しています
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
                <tr className="border-b border-gray-200">
                  <th className="py-3 pr-4 text-left font-medium text-gray-500">
                    機能
                  </th>
                  {PLAN_ORDER.map((plan) => (
                    <th
                      key={plan}
                      className={`px-4 py-3 text-center font-semibold ${
                        plan === "starter"
                          ? "text-blue-600"
                          : plan === "team"
                          ? "text-purple-600"
                          : "text-gray-900"
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
                      idx % 2 === 0 ? "bg-gray-50/50" : "bg-white"
                    }
                  >
                    <td className="py-3 pr-4 text-gray-700 font-medium">
                      {feature.label}
                    </td>
                    {(["free", "starter", "team"] as const).map((plan) => {
                      const val = feature[plan];
                      return (
                        <td key={plan} className="px-4 py-3 text-center">
                          {typeof val === "boolean" ? (
                            val ? (
                              <Check className="mx-auto h-4 w-4 text-green-500" />
                            ) : (
                              <X className="mx-auto h-4 w-4 text-gray-300" />
                            )
                          ) : (
                            <span className="text-gray-600">{val}</span>
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
          <div className="divide-y divide-gray-100">
            {FAQ_ITEMS.map((item, idx) => (
              <div key={idx}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between py-4 text-left transition-colors hover:text-blue-600"
                  onClick={() =>
                    setExpandedFaq(expandedFaq === idx ? null : idx)
                  }
                  aria-expanded={expandedFaq === idx}
                >
                  <span className="pr-4 text-sm font-medium text-gray-900">
                    {item.question}
                  </span>
                  {expandedFaq === idx ? (
                    <ChevronUp className="h-4 w-4 flex-shrink-0 text-gray-400" />
                  ) : (
                    <ChevronDown className="h-4 w-4 flex-shrink-0 text-gray-400" />
                  )}
                </button>
                {expandedFaq === idx && (
                  <p className="pb-4 text-sm leading-relaxed text-gray-500">
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
                Standardプランなら無制限の日報生成、週報対応、Slack連携が月額¥1,980で使えます。
                {billingInterval === "annual" && (
                  <span className="font-medium text-white">
                    {" "}年額なら月¥1,580 -- 20%もお得です。
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
              {checkoutLoadingPlan === "starter" ? "処理中..." : "Standardにアップグレード"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
