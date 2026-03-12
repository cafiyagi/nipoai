/**
 * Shared report template definitions.
 *
 * Workspaces can customise the ordered list of sections that appear
 * in AI-generated daily reports. This module holds the types,
 * the default template, and a strict validator.
 */

export interface TemplateSection {
  key: string;         // machine key, e.g. "achievements"
  label: string;       // UI label, e.g. "やったこと"
  placeholder: string; // textarea placeholder
  ai_hint: string;     // extra instruction for AI (empty = none)
}

export type ReportTemplate = TemplateSection[];

export const DEFAULT_TEMPLATE: ReportTemplate = [
  {
    key: "achievements",
    label: "やったこと",
    placeholder: "今日取り組んだ作業...",
    ai_hint: "",
  },
  {
    key: "challenges",
    label: "課題・困っていること",
    placeholder: "直面した課題や困っていること...",
    ai_hint: "",
  },
  {
    key: "tomorrow_plan",
    label: "明日の予定",
    placeholder: "明日取り組む予定の作業...",
    ai_hint: "",
  },
  {
    key: "remarks",
    label: "所感",
    placeholder: "今日の振り返りや気づき...",
    ai_hint: "",
  },
];

const KEY_PATTERN = /^[a-z][a-z0-9_]{0,49}$/;

/**
 * Validate an unknown value as a ReportTemplate.
 * Returns the validated template or null if invalid.
 */
export function validateTemplate(input: unknown): ReportTemplate | null {
  if (!Array.isArray(input)) return null;
  if (input.length < 1 || input.length > 10) return null;

  const seenKeys = new Set<string>();

  for (const item of input) {
    if (typeof item !== "object" || item === null) return null;

    const section = item as Record<string, unknown>;

    if (typeof section.key !== "string") return null;
    if (typeof section.label !== "string") return null;
    if (typeof section.placeholder !== "string") return null;
    if (typeof section.ai_hint !== "string") return null;

    if (!KEY_PATTERN.test(section.key)) return null;
    if (section.label.trim().length === 0) return null;

    if (seenKeys.has(section.key)) return null;
    seenKeys.add(section.key);
  }

  // Return a clean copy with only the expected fields
  return (input as Record<string, unknown>[]).map((item) => ({
    key: item.key as string,
    label: item.label as string,
    placeholder: item.placeholder as string,
    ai_hint: item.ai_hint as string,
  }));
}
