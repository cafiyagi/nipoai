"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Send, Save, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import type { ReportContent, ReportStatus } from "@/lib/supabase/types";

import type { ReportData } from "./page";

// ---------------------------------------------------------------------------
// Helper: convert array content to display text and back
// ---------------------------------------------------------------------------

function contentToText(items: string[]): string {
  if (!items || items.length === 0) return "";
  return items.map((item) => `- ${item}`).join("\n");
}

function textToContent(text: string): string[] {
  if (!text.trim()) return [];
  return text
    .split("\n")
    .map((line) => line.replace(/^[-\s]*/, "").trim())
    .filter((line) => line.length > 0);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface ReportEditorProps {
  initialReport: ReportData;
}

export function ReportEditor({ initialReport }: ReportEditorProps) {
  const router = useRouter();
  const { toast } = useToast();

  const template = initialReport.template;
  const [status, setStatus] = useState<ReportStatus>(initialReport.status);
  const [sectionTexts, setSectionTexts] = useState<Record<string, string>>(
    () => {
      const texts: Record<string, string> = {};
      for (const section of template) {
        texts[section.key] = contentToText(initialReport.content[section.key] ?? []);
      }
      return texts;
    },
  );
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const isSubmitted = status === "submitted" || status === "delivered";
  const isEditable = status === "draft";

  // ---------- Build content from current text ----------
  const buildContent = useCallback((): ReportContent => {
    const content: ReportContent = {};
    for (const section of template) {
      content[section.key] = textToContent(sectionTexts[section.key] ?? "");
    }
    return content;
  }, [sectionTexts, template]);

  // ---------- Section change handler ----------
  const handleSectionChange = useCallback(
    (key: string, value: string) => {
      setSectionTexts((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  // ---------- Save (PATCH) ----------
  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const content = buildContent();
      const res = await fetch(`/api/reports/${initialReport.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "保存に失敗しました");
      }

      toast("日報を保存しました", "success");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "保存に失敗しました";
      toast(message, "error");
    } finally {
      setSaving(false);
    }
  }, [buildContent, initialReport.id, toast]);

  // ---------- Submit (POST) ----------
  const handleSubmit = useCallback(async () => {
    setSubmitting(true);
    try {
      // First save current edits
      const content = buildContent();
      const saveRes = await fetch(`/api/reports/${initialReport.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      if (!saveRes.ok) {
        const data = await saveRes.json().catch(() => ({}));
        throw new Error(data.error || "保存に失敗しました");
      }

      // Then submit
      const submitRes = await fetch(
        `/api/reports/${initialReport.id}/submit`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        },
      );

      if (!submitRes.ok) {
        const data = await submitRes.json().catch(() => ({}));
        throw new Error(data.error || "提出に失敗しました");
      }

      setStatus("submitted");
      toast("日報を提出しました", "success");
      router.refresh();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "提出に失敗しました";
      toast(message, "error");
    } finally {
      setSubmitting(false);
    }
  }, [buildContent, initialReport.id, toast, router]);

  // ---------- Status badge ----------
  const statusLabel = (() => {
    switch (status) {
      case "submitted":
        return "提出済み";
      case "delivered":
        return "配信済み";
      case "draft":
        return "下書き";
      case "generating":
        return "生成中";
    }
  })();

  const statusVariant = isSubmitted ? "success" : "default";

  // ---------- Auto-resize textarea ----------
  const autoResize = useCallback((el: HTMLTextAreaElement | null) => {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  }, []);

  return (
    <div className="p-6">
      {/* Sticky header: Back button + date + status + actions */}
      <div className="sticky top-0 z-10 -mx-6 mb-6 border-b border-gray-200 bg-white/95 px-6 py-4 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/dashboard/reports")}
            >
              <ArrowLeft className="mr-1 h-4 w-4" />
              戻る
            </Button>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {initialReport.reportDate}
              </h2>
              <Badge variant={statusVariant} className="mt-1">
                {statusLabel}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isEditable && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  {saving ? "保存中..." : "保存"}
                </Button>
                <Button onClick={handleSubmit} disabled={submitting}>
                  {submitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="mr-2 h-4 w-4" />
                  )}
                  {submitting ? "提出中..." : "提出する"}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Section navigation (shown when 6+ sections) */}
      {template.length >= 6 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {template.map((section) => (
            <button
              key={section.key}
              onClick={() => {
                document
                  .getElementById(`section-${section.key}`)
                  ?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
            >
              {section.label}
            </button>
          ))}
        </div>
      )}

      {/* Report sections */}
      <div className="flex flex-col gap-6">
        {template.map((section) => (
          <Card key={section.key} id={`section-${section.key}`}>
            <CardHeader>
              <CardTitle className="text-base">{section.label}</CardTitle>
            </CardHeader>
            <CardContent>
              {isEditable ? (
                <textarea
                  ref={(el) => autoResize(el)}
                  className="min-h-[80px] w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500"
                  value={sectionTexts[section.key] ?? ""}
                  onChange={(e) => {
                    handleSectionChange(section.key, e.target.value);
                    autoResize(e.target);
                  }}
                  placeholder={section.placeholder}
                  aria-label={section.label}
                />
              ) : (
                <div className="text-sm text-gray-700">
                  {(sectionTexts[section.key] ?? "")
                    .split("\n")
                    .map((line, i) => (
                      <p key={i} className={line.trim() ? "py-0.5" : "h-2"}>
                        {line}
                      </p>
                    ))}
                  {!(sectionTexts[section.key] ?? "").trim() && (
                    <p className="italic text-gray-400">内容なし</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
