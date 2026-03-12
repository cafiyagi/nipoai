import type { Plan } from "@/lib/supabase/types";

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
    name: "Free",
    priceMonthly: 0,
    stripePriceId: "", // No Stripe price for free tier
    limits: {
      maxMembers: 3,
      maxReportsPerMonth: 30,
      retentionDays: 7,
    },
  },
  starter: {
    plan: "starter",
    name: "Starter",
    priceMonthly: 1980,
    stripePriceId: process.env.STRIPE_PRICE_STARTER ?? "price_starter_placeholder",
    limits: {
      maxMembers: 10,
      maxReportsPerMonth: 300,
      retentionDays: 90,
    },
  },
  team: {
    plan: "team",
    name: "Team",
    priceMonthly: 4980,
    stripePriceId: process.env.STRIPE_PRICE_TEAM ?? "price_team_placeholder",
    limits: {
      maxMembers: Infinity,
      maxReportsPerMonth: Infinity,
      retentionDays: Infinity,
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
