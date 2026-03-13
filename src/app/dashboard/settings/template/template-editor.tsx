"use client";

import { useState, useCallback } from "react";
import {
  FileText,
  ArrowUp,
  ArrowDown,
  Trash2,
  Plus,
  RotateCcw,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import {
  DEFAULT_TEMPLATE,
  type ReportTemplate,
  type TemplateSection,
} from "@/lib/report-template";

const MAX_SECTIONS = 10;
const MIN_SECTIONS = 1;

interface TemplateEditorProps {
  workspaceId: string;
  initialTemplate: ReportTemplate;
}

export function TemplateEditor({
  workspaceId,
  initialTemplate,
}: TemplateEditorProps) {
  const { toast } = useToast();
  const [sections, setSections] = useState<TemplateSection[]>(
    () => structuredClone(initialTemplate),
  );
  const [isSaving, setIsSaving] = useState(false);

  const handleLabelChange = useCallback(
    (index: number, value: string) => {
      setSections((prev) => {
        const next = [...prev];
        const section = { ...next[index] };
        const isNewSection = section.key.startsWith("section_");
        section.label = value;
        if (isNewSection) {
          // Regenerate key for new sections based on timestamp
          // Keep the existing generated key — don't re-derive from label
        }
        next[index] = section;
        return next;
      });
    },
    [],
  );

  const handlePlaceholderChange = useCallback(
    (index: number, value: string) => {
      setSections((prev) => {
        const next = [...prev];
        next[index] = { ...next[index], placeholder: value };
        return next;
      });
    },
    [],
  );

  const handleAiHintChange = useCallback(
    (index: number, value: string) => {
      setSections((prev) => {
        const next = [...prev];
        next[index] = { ...next[index], ai_hint: value };
        return next;
      });
    },
    [],
  );

  const handleMoveUp = useCallback((index: number) => {
    if (index === 0) return;
    setSections((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
  }, []);

  const handleMoveDown = useCallback((index: number) => {
    setSections((prev) => {
      if (index >= prev.length - 1) return prev;
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next;
    });
  }, []);

  const handleDelete = useCallback((index: number) => {
    setSections((prev) => {
      if (prev.length <= MIN_SECTIONS) return prev;
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const handleAdd = useCallback(() => {
    setSections((prev) => {
      if (prev.length >= MAX_SECTIONS) return prev;
      const newSection: TemplateSection = {
        key: `section_${Date.now()}`,
        label: "",
        placeholder: "",
        ai_hint: "",
      };
      return [...prev, newSection];
    });
  }, []);

  const handleResetDefault = useCallback(() => {
    setSections(structuredClone(DEFAULT_TEMPLATE));
  }, []);

  const handleSave = async () => {
    // Validate: all labels must be non-empty
    const emptyLabel = sections.find((s) => s.label.trim().length === 0);
    if (emptyLabel) {
      toast("セクション名を入力してください", "error");
      return;
    }

    // Check duplicate keys
    const keys = new Set<string>();
    for (const s of sections) {
      if (keys.has(s.key)) {
        toast("セクションキーが重複しています", "error");
        return;
      }
      keys.add(s.key);
    }

    setIsSaving(true);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ report_template: sections }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast(data.error ?? "テンプレートの保存に失敗しました", "error");
        return;
      }

      toast("テンプレートを保存しました", "success");
    } catch {
      toast("テンプレートの保存に失敗しました", "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-gray-400" />
          <CardTitle>日報テンプレート</CardTitle>
        </div>
        <CardDescription>
          日報のセクション構成をカスタマイズできます。
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-3">
          {sections.map((section, index) => (
            <div
              key={section.key}
              className="rounded-lg border border-gray-200 bg-gray-50/50 p-4"
            >
              <div className="flex items-start gap-3">
                {/* Reorder buttons */}
                <div className="flex flex-col gap-1 pt-1">
                  <button
                    type="button"
                    onClick={() => handleMoveUp(index)}
                    disabled={index === 0}
                    className="rounded p-0.5 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-30"
                    aria-label="上に移動"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveDown(index)}
                    disabled={index === sections.length - 1}
                    className="rounded p-0.5 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-30"
                    aria-label="下に移動"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </button>
                </div>

                {/* Fields */}
                <div className="flex min-w-0 flex-1 flex-col gap-3">
                  <div>
                    <Input
                      label="セクション名"
                      value={section.label}
                      onChange={(e) => handleLabelChange(index, e.target.value)}
                      placeholder="例: やったこと"
                      required
                    />
                    <p className="mt-1 text-xs text-gray-400">日報の入力欄の見出しになります</p>
                  </div>

                  <div>
                    <Input
                      label="入力例"
                      value={section.placeholder}
                      onChange={(e) =>
                        handlePlaceholderChange(index, e.target.value)
                      }
                      placeholder="例: 今日完了したタスクを箇条書きで記入"
                    />
                    <p className="mt-1 text-xs text-gray-400">社員が日報を書くとき、入力欄にうすく表示される案内文です</p>
                  </div>

                  <div>
                    <Input
                      label="AIへの指示"
                      value={section.ai_hint}
                      onChange={(e) => handleAiHintChange(index, e.target.value)}
                      placeholder="例: 具体的な数値があれば褒めてください"
                    />
                    <p className="mt-1 text-xs text-gray-400">AIが日報を生成するとき、このセクションをどう書くかの指示です</p>
                  </div>
                </div>

                {/* Delete button */}
                <button
                  type="button"
                  onClick={() => handleDelete(index)}
                  disabled={sections.length <= MIN_SECTIONS}
                  className="mt-1 rounded p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30"
                  aria-label="セクションを削除"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}

          {/* Add section button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAdd}
            disabled={sections.length >= MAX_SECTIONS}
            className="w-fit"
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            セクションを追加
          </Button>

          {sections.length >= MAX_SECTIONS && (
            <p className="text-xs text-gray-500">
              セクションは最大{MAX_SECTIONS}個までです。
            </p>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between border-t border-gray-200 pt-4">
            <button
              type="button"
              onClick={handleResetDefault}
              className="inline-flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-gray-700"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              デフォルトに戻す
            </button>

            <Button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  保存中...
                </>
              ) : (
                "保存"
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
