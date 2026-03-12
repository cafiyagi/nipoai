import { Header } from "@/components/layout/header";
import { getWorkspaceContext } from "@/lib/dashboard/get-workspace-context";
import { DEFAULT_TEMPLATE } from "@/lib/report-template";
import type { SlackIntegration, Subscription } from "@/lib/supabase/types";

import { SettingsTabs } from "./settings-tabs";

export default async function SettingsPage() {
  const { workspace, workspaceId, isAdmin, supabase } =
    await getWorkspaceContext();

  // Fetch all data in parallel
  const [slackResult, subscriptionResult, memberResult, reportResult] =
    await Promise.all([
      supabase
        .from("slack_integrations")
        .select("id, slack_team_name, selected_channel_ids")
        .eq("workspace_id", workspaceId)
        .limit(1)
        .single(),
      supabase
        .from("subscriptions")
        .select("id, plan, status, current_period_end")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single(),
      supabase
        .from("user_workspace_memberships")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId),
      (() => {
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const firstDayStr = firstDayOfMonth.toISOString().split("T")[0];
        return supabase
          .from("daily_reports")
          .select("id", { count: "exact", head: true })
          .eq("workspace_id", workspaceId)
          .gte("report_date", firstDayStr);
      })(),
    ]);

  const slackIntegration = slackResult.data as Pick<
    SlackIntegration,
    "id" | "slack_team_name" | "selected_channel_ids"
  > | null;

  const subscription = subscriptionResult.data as Pick<
    Subscription,
    "id" | "plan" | "status" | "current_period_end"
  > | null;

  const template = workspace.report_template ?? DEFAULT_TEMPLATE;

  return (
    <div>
      <Header title="設定" />
      <div className="p-6">
        <SettingsTabs
          workspace={workspace}
          isAdmin={isAdmin}
          slackIntegration={slackIntegration}
          subscription={subscription}
          memberCount={memberResult.count ?? 0}
          reportCount={reportResult.count ?? 0}
          template={template}
        />
      </div>
    </div>
  );
}
