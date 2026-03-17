export interface ModelConfig {
  model: string;
  maxTokens: number;
}

const MODEL_BY_PLAN: Record<string, ModelConfig> = {
  free: {
    model: "gpt-4.1-nano",
    maxTokens: 1024,
  },
  starter: {
    model: "gpt-4.1-mini",
    maxTokens: 1024,
  },
  team: {
    model: "gpt-4.1",
    maxTokens: 1024,
  },
};

export function getModelForPlan(plan?: string): ModelConfig {
  if (plan && plan in MODEL_BY_PLAN) {
    return MODEL_BY_PLAN[plan];
  }
  return MODEL_BY_PLAN.free;
}
