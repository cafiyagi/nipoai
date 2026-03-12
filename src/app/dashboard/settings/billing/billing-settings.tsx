"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CreditCard, ExternalLink } from "lucide-react";
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

const PLAN_LABELS: Record<Plan, string> = {
  free: "Free",
  starter: "Starter",
  team: "Team",
};

const PLAN_PRICES: Record<Plan, string> = {
  free: "無料",
  starter: "¥1,980 / 月",
  team: "¥4,980 / 月",
};

const PLAN_MEMBER_LIMITS: Record<Plan, number> = {
  free: 3,
  starter: 10,
  team: Infinity,
};

const PLAN_REPORT_LIMITS: Record<Plan, number> = {
  free: 30,
  starter: 300,
  team: Infinity,
};

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

  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);
  const [isPortalLoading, setIsPortalLoading] = useState(false);

  // Show checkout result toast on mount
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

  const currentPlan = workspace.plan;
  const memberLimit = PLAN_MEMBER_LIMITS[currentPlan];
  const reportLimit = PLAN_REPORT_LIMITS[currentPlan];

  const subscriptionStatusLabel = (
    status: string | undefined,
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

  const handleUpgrade = async (plan: "starter" | "team") => {
    if (!isAdmin) {
      toast("管理者のみプランを変更できます", "error");
      return;
    }

    setIsCheckoutLoading(true);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan,
          workspace_id: workspace.id,
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
      setIsCheckoutLoading(false);
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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-gray-400" />
          <CardTitle>プラン情報</CardTitle>
        </div>
        <CardDescription>
          現在のプランと請求情報を確認できます。
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-semibold text-gray-900">
                  {PLAN_LABELS[currentPlan]} プラン
                </h4>
                <Badge variant={subStatus.variant}>{subStatus.label}</Badge>
              </div>
              <p className="mt-1 text-sm text-gray-500">
                {PLAN_PRICES[currentPlan]}
                {subscription?.current_period_end && (
                  <>
                    {" "}
                    -- 次回請求日:{" "}
                    {formatDate(subscription.current_period_end)}
                  </>
                )}
              </p>
            </div>
            {isAdmin && (
              <div className="flex gap-2">
                {currentPlan === "free" && (
                  <Button
                    variant="default"
                    size="sm"
                    disabled={isCheckoutLoading}
                    onClick={() => handleUpgrade("starter")}
                  >
                    {isCheckoutLoading ? "処理中..." : "アップグレード"}
                  </Button>
                )}
                {currentPlan === "starter" && (
                  <Button
                    variant="default"
                    size="sm"
                    disabled={isCheckoutLoading}
                    onClick={() => handleUpgrade("team")}
                  >
                    {isCheckoutLoading
                      ? "処理中..."
                      : "Team にアップグレード"}
                  </Button>
                )}
                {currentPlan !== "free" && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isPortalLoading}
                    onClick={handleBillingPortal}
                  >
                    <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                    {isPortalLoading ? "処理中..." : "請求管理"}
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-gray-100 p-3">
            <p className="text-xs text-gray-500">ユーザー数</p>
            <p className="mt-1 text-lg font-semibold text-gray-900">
              {memberCount} /{" "}
              {memberLimit === Infinity ? "無制限" : memberLimit}
            </p>
          </div>
          <div className="rounded-lg border border-gray-100 p-3">
            <p className="text-xs text-gray-500">今月の日報生成数</p>
            <p className="mt-1 text-lg font-semibold text-gray-900">
              {reportCount} /{" "}
              {reportLimit === Infinity ? "無制限" : reportLimit}
            </p>
          </div>
          <div className="rounded-lg border border-gray-100 p-3">
            <p className="text-xs text-gray-500">Slack連携</p>
            <p className="mt-1 text-lg font-semibold text-gray-900">
              {slackConnected ? "連携済み" : "未連携"}
            </p>
          </div>
        </div>

        {currentPlan === "free" && (
          <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
            <p className="text-sm font-medium text-blue-800">
              Starter
              プランにアップグレードすると、最大10名のメンバーと月300件のレポート生成が利用できます。
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
