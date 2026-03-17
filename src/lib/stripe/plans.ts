import type { Plan } from "@/lib/supabase/types";
import { PLANS } from "@/lib/constants";

export interface StripePlanConfig {
  plan: Plan;
  name: string;
  priceMonthly: number;
  stripePriceId: string;
  limits: {
    maxMembers: number;
    maxReportsPerMonth: number;
    retentionDays: number;
  };
}

export const STRIPE_PLANS: Record<Plan, StripePlanConfig> = {
  free: {
    plan: "free",
    name: PLANS.free.name,
    priceMonthly: PLANS.free.price,
    stripePriceId: "",
    limits: {
      maxMembers: PLANS.free.limits.maxMembers,
      maxReportsPerMonth: PLANS.free.limits.maxReportsPerMonth,
      retentionDays: PLANS.free.limits.retentionDays,
    },
  },
  starter: {
    plan: "starter",
    name: PLANS.starter.name,
    priceMonthly: PLANS.starter.price,
    stripePriceId: process.env.STRIPE_PRICE_STARTER ?? "price_starter_placeholder",
    limits: {
      maxMembers: PLANS.starter.limits.maxMembers,
      maxReportsPerMonth: PLANS.starter.limits.maxReportsPerMonth,
      retentionDays: PLANS.starter.limits.retentionDays,
    },
  },
  team: {
    plan: "team",
    name: PLANS.team.name,
    priceMonthly: PLANS.team.price,
    stripePriceId: process.env.STRIPE_PRICE_TEAM ?? "price_team_placeholder",
    limits: {
      maxMembers: PLANS.team.limits.maxMembers,
      maxReportsPerMonth: PLANS.team.limits.maxReportsPerMonth,
      retentionDays: PLANS.team.limits.retentionDays,
    },
  },
} as const;

export function getPlanByStripePriceId(priceId: string): Plan | null {
  for (const [plan, config] of Object.entries(STRIPE_PLANS)) {
    if (config.stripePriceId === priceId) {
      return plan as Plan;
    }
  }
  return null;
}
