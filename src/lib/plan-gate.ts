import type { SupabaseClient } from "@supabase/supabase-js";
import type { Plan } from "@/lib/supabase/types";
import { PLANS, type PlanLimits } from "@/lib/constants";

/**
 * Check if a plan has a specific boolean feature enabled.
 */
export function checkPlanFeature(
  plan: Plan,
  feature: keyof PlanLimits,
): boolean {
  return !!PLANS[plan].limits[feature];
}

/**
 * Check the monthly AI report generation quota for a workspace.
 * Returns whether the workspace is allowed to generate another report,
 * plus usage stats.
 */
export async function checkReportQuota(
  supabase: SupabaseClient,
  workspaceId: string,
  plan: Plan,
): Promise<{ allowed: boolean; used: number; limit: number }> {
  const limit = PLANS[plan].limits.maxReportsPerMonth;

  // Unlimited plans always pass
  if (limit === Infinity) {
    return { allowed: true, used: 0, limit: Infinity };
  }

  // Count reports generated this month for this workspace
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .slice(0, 10);

  const { count, error } = await supabase
    .from("daily_reports")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .gte("created_at", `${monthStart}T00:00:00.000Z`);

  if (error) {
    console.error("checkReportQuota error:", error);
    // Fail open — don't block on DB errors
    return { allowed: true, used: 0, limit };
  }

  const used = count ?? 0;
  return { allowed: used < limit, used, limit };
}

/**
 * Get the current report usage for display purposes (e.g. dashboard).
 */
export async function getReportUsage(
  supabase: SupabaseClient,
  workspaceId: string,
  plan: Plan,
): Promise<{ used: number; limit: number; remaining: number }> {
  const { used, limit } = await checkReportQuota(supabase, workspaceId, plan);
  const remaining = limit === Infinity ? Infinity : Math.max(0, limit - used);
  return { used, limit, remaining };
}
