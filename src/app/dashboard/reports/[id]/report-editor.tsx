"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Send, Save, Loader2, Hash, Lock, Download, Mail, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import type { ReportContent, ReportStatus, Plan } from "@/lib/supabase/types";
import { PLANS } from "@/lib/constants";

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
  plan: Plan;
}

export function ReportEditor({ initialReport, plan }: ReportEditorProps) {
  const showWatermark = plan === "free";
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
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [channels, setChannels] = useState<{id: string; name: string; is_private: boolean}[]>([]);
  const [isLoadingChannels, setIsLoadingChannels] = useState(false);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [reporterName, setReporterName] = useState(initialReport.userName);
  const [reporterNameSaved, setReporterNameSaved] = useState(initialReport.userName);

  const isSubmitted = status === "submitted" || status === "delivered";
  const isEditable = status === "draft";

  // ---------- Save reporter name on blur ----------
  const handleReporterNameBlur = useCallback(async () => {
    const trimmed = reporterName.trim();
    if (trimmed === reporterNameSaved) return;

    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ display_name: trimmed }),
      });

      if (res.ok) {
        setReporterNameSaved(trimmed);
      }
    } catch {
      // silent — non-critical update
    }
  }, [reporterName, reporterNameSaved]);

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

  // ---------- Open share dialog ----------
  const handleOpenShareDialog = useCallback(async () => {
    setShareDialogOpen(true);
    setIsLoadingChannels(true);
    setSelectedChannelId(null);

    try {
      const res = await fetch(
        `/api/slack/channels?workspace_id=${initialReport.workspaceId}`,
      );
      const data = await res.json();

      if (!res.ok) {
        toast(data.error ?? "チャンネルの取得に失敗しました", "error");
        setShareDialogOpen(false);
        return;
      }

      setChannels(data.channels as {id: string; name: string; is_private: boolean}[]);
    } catch {
      toast("チャンネルの取得に失敗しました", "error");
      setShareDialogOpen(false);
    } finally {
      setIsLoadingChannels(false);
    }
  }, [initialReport.workspaceId, toast]);

  // ---------- Submit (POST) ----------
  const handleSubmit = useCallback(async (channelId: string) => {
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

      // Then submit with channel_id
      const submitRes = await fetch(
        `/api/reports/${initialReport.id}/submit`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ channel_id: channelId }),
        },
      );

      if (!submitRes.ok) {
        const data = await submitRes.json().catch(() => ({}));
        throw new Error(data.error || "共有に失敗しました");
      }

      const result = await submitRes.json().catch(() => ({}));

      setStatus("submitted");
      setShareDialogOpen(false);

      if (result.warning) {
        toast(`${result.warning} (${result.delivery_error || ""})`, "error");
      } else {
        toast("日報をSlackに共有しました", "success");
      }
      router.refresh();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "共有に失敗しました";
      toast(message, "error");
    } finally {
      setSubmitting(false);
    }
  }, [buildContent, initialReport.id, toast, router]);

  // ---------- PDF download ----------
  const handlePdfDownload = useCallback(() => {
    window.open(`/api/reports/${initialReport.id}/pdf`, "_blank");
  }, [initialReport.id]);

  // ---------- Email send ----------
  const emailDeliveryEnabled = PLANS[plan]?.limits.emailDelivery ?? false;

  const handleSendEmail = useCallback(async () => {
    const emails = emailInput
      .split(",")
      .map((e) => e.trim())
      .filter((e) => e.length > 0);

    if (emails.length === 0) {
      toast("メールアドレスを入力してください", "error");
      return;
    }

    setSendingEmail(true);
    try {
      const res = await fetch(`/api/reports/${initialReport.id}/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "メール送信に失敗しました");
      }

      toast("メールを送信しました", "success");
      setEmailDialogOpen(false);
      setEmailInput("");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "メール送信に失敗しました";
      toast(message, "error");
    } finally {
      setSendingEmail(false);
    }
  }, [emailInput, initialReport.id, toast]);

  // ---------- Status badge ----------
  const statusLabel = (() => {
    switch (status) {
      case "submitted":
        return "共有済み";
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
      <div className="sticky top-0 z-10 -mx-6 mb-6 border-b border-[var(--border-primary)] px-6 py-4 backdrop-blur-sm" style={{ backgroundColor: "color-mix(in srgb, var(--bg-secondary) 95%, transparent)" }}>
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
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                  {initialReport.reportDate}
                </h2>
                <Badge variant={statusVariant}>
                  {statusLabel}
                </Badge>
              </div>
              <div className="mt-2 flex items-center gap-2 rounded-md border border-[var(--border-primary)] bg-[var(--bg-primary)] px-3 py-1.5 transition-colors focus-within:border-[var(--accent)] focus-within:ring-2 focus-within:ring-[var(--accent)]/20">
                <User className="h-4 w-4 flex-shrink-0 text-[var(--accent)]" />
                <span className="text-sm font-bold text-[var(--text-primary)]">報告者:</span>
                <input
                  type="text"
                  value={reporterName}
                  onChange={(e) => setReporterName(e.target.value)}
                  onBlur={handleReporterNameBlur}
                  placeholder="名前を入力してください"
                  className="min-w-0 flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none"
                />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePdfDownload}
            >
              <Download className="mr-1 h-4 w-4" />
              PDF
            </Button>
            {emailDeliveryEnabled ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEmailDialogOpen(true)}
              >
                <Mail className="mr-1 h-4 w-4" />
                メール送信
              </Button>
            ) : (
              plan === "free" && (
                <a
                  href="/dashboard/settings?tab=billing"
                  className="inline-flex items-center gap-1 rounded-md border border-[var(--border-primary)] px-3 py-1.5 text-xs font-medium text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-secondary)]"
                >
                  <Mail className="h-4 w-4" />
                  メール送信
                  <span className="ml-1 rounded bg-[var(--accent)]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[var(--accent)]">
                    PRO
                  </span>
                </a>
              )
            )}
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
                <Button onClick={handleOpenShareDialog} disabled={submitting}>
                  <Send className="mr-2 h-4 w-4" />
                  Slackに共有する
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
              className="rounded-full border border-[var(--border-primary)] bg-[var(--bg-card)] px-3 py-1 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
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
                  className="min-h-[80px] w-full resize-none rounded-lg border border-[var(--border-primary)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] transition-colors focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 disabled:cursor-not-allowed disabled:opacity-50"
                  value={sectionTexts[section.key] ?? ""}
                  onChange={(e) => {
                    handleSectionChange(section.key, e.target.value);
                    autoResize(e.target);
                  }}
                  placeholder={section.placeholder}
                  aria-label={section.label}
                />
              ) : (
                <div className="text-sm text-[var(--text-secondary)]">
                  {(sectionTexts[section.key] ?? "")
                    .split("\n")
                    .map((line, i) => (
                      <p key={i} className={line.trim() ? "py-0.5" : "h-2"}>
                        {line}
                      </p>
                    ))}
                  {!(sectionTexts[section.key] ?? "").trim() && (
                    <p className="italic text-[var(--text-muted)]">内容なし</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Watermark for free plan */}
      {showWatermark && (
        <div className="mt-6 rounded-lg border border-dashed border-[var(--border-primary)] bg-[var(--bg-hover)] px-4 py-3 text-center">
          <p className="text-xs text-[var(--text-muted)]">
            Generated by NipoAI — Free Plan
          </p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            <a
              href="/dashboard/settings?tab=billing"
              className="text-[var(--accent)] hover:underline"
            >
              アップグレード
            </a>
            してウォーターマークを削除
          </p>
        </div>
      )}

      {/* Share to Slack dialog */}
      <Dialog
        open={shareDialogOpen}
        onClose={() => setShareDialogOpen(false)}
        title="Slackに共有"
        description="共有先のチャンネルを選択してください。"
        className="max-w-lg"
      >
        <div className="flex flex-col gap-4">
          {isLoadingChannels ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-[var(--text-muted)]" />
              <span className="ml-2 text-sm text-[var(--text-secondary)]">
                チャンネルを読み込み中...
              </span>
            </div>
          ) : (
            <>
              <div className="max-h-80 overflow-y-auto rounded-lg border border-[var(--border-primary)]">
                {channels.length === 0 ? (
                  <div className="p-4 text-center text-sm text-[var(--text-secondary)]">
                    チャンネルが見つかりませんでした。
                  </div>
                ) : (
                  <ul className="divide-y divide-[var(--border-primary)]">
                    {channels.map((channel) => (
                      <li key={channel.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedChannelId(channel.id)}
                          className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--bg-hover)] ${
                            selectedChannelId === channel.id
                              ? "bg-[var(--accent)]/10"
                              : ""
                          }`}
                        >
                          <div className="flex min-w-0 flex-1 items-center gap-2">
                            {channel.is_private ? (
                              <Lock className="h-3.5 w-3.5 flex-shrink-0 text-[var(--text-muted)]" />
                            ) : (
                              <Hash className="h-3.5 w-3.5 flex-shrink-0 text-[var(--text-muted)]" />
                            )}
                            <span className={`truncate text-sm ${
                              selectedChannelId === channel.id
                                ? "font-semibold text-[var(--accent)]"
                                : "font-medium text-[var(--text-primary)]"
                            }`}>
                              {channel.name}
                            </span>
                          </div>
                          {selectedChannelId === channel.id && (
                            <div className="h-2 w-2 flex-shrink-0 rounded-full bg-[var(--accent)]" />
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShareDialogOpen(false)}
                >
                  キャンセル
                </Button>
                <Button
                  onClick={() => {
                    if (selectedChannelId) handleSubmit(selectedChannelId);
                  }}
                  disabled={!selectedChannelId || submitting}
                >
                  {submitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="mr-2 h-4 w-4" />
                  )}
                  {submitting ? "共有中..." : "共有する"}
                </Button>
              </div>
            </>
          )}
        </div>
      </Dialog>

      {/* Email send dialog */}
      <Dialog
        open={emailDialogOpen}
        onClose={() => setEmailDialogOpen(false)}
        title="メールで送信"
        description="送信先のメールアドレスを入力してください。複数の場合はカンマ区切りで入力できます。"
        className="max-w-lg"
      >
        <div className="flex flex-col gap-4">
          <input
            type="text"
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            placeholder="email@example.com"
            className="w-full rounded-lg border border-[var(--border-primary)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] transition-colors focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setEmailDialogOpen(false)}
            >
              キャンセル
            </Button>
            <Button
              onClick={handleSendEmail}
              disabled={sendingEmail || !emailInput.trim()}
            >
              {sendingEmail ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Mail className="mr-2 h-4 w-4" />
              )}
              {sendingEmail ? "送信中..." : "送信"}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
