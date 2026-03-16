"use client";

import { useState } from "react";
import { AlertTriangle, AlertCircle, Trash2 } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import type { Workspace } from "@/lib/supabase/types";

interface AccountSettingsProps {
  workspace: Workspace;
  memberCount: number;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

export function AccountSettings({
  workspace,
  memberCount,
}: AccountSettingsProps) {
  const { toast } = useToast();

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== "削除する") return;

    try {
      const res = await fetch(`/api/workspaces/${workspace.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        toast(data.error ?? "削除に失敗しました", "error");
        return;
      }

      toast("アカウントを削除しました", "info");
      setDeleteDialogOpen(false);
      window.location.href = "/";
    } catch {
      toast("削除に失敗しました", "error");
    }
  };

  return (
    <>
      {/* 警告バナー */}
      <div className="mb-6 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-400" />
          <p className="text-sm font-medium text-amber-300">
            この画面の操作は取り消すことができません。
          </p>
        </div>
      </div>

      {/* アカウント情報カード */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-[var(--border-primary)] p-3">
              <p className="text-xs text-[var(--text-secondary)]">ワークスペース名</p>
              <p className="mt-1 font-medium text-[var(--text-primary)]">
                {workspace.name}
              </p>
            </div>
            <div className="rounded-lg border border-[var(--border-primary)] p-3">
              <p className="text-xs text-[var(--text-secondary)]">メンバー数</p>
              <p className="mt-1 font-medium text-[var(--text-primary)]">
                {memberCount}人
              </p>
            </div>
            <div className="rounded-lg border border-[var(--border-primary)] p-3">
              <p className="text-xs text-[var(--text-secondary)]">作成日</p>
              <p className="mt-1 font-medium text-[var(--text-primary)]">
                {formatDate(workspace.created_at)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 削除セクション */}
      <Card className="border-[var(--danger)]/30">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-[var(--danger)]" />
            <CardTitle className="text-[var(--danger)]">危険な操作</CardTitle>
          </div>
          <CardDescription>
            これらの操作は取り消すことができません。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border border-[var(--danger)]/30 bg-[var(--danger-bg)] p-4">
            <div>
              <p className="font-medium text-[var(--danger)]">
                アカウントを削除する
              </p>
              <p className="mt-0.5 text-sm text-[var(--danger)]">
                すべてのデータが永久に削除されます。
              </p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              削除
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 削除確認ダイアログ */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setDeleteConfirm("");
        }}
        title="アカウント削除の確認"
        description="この操作は取り消せません。すべてのデータが永久に削除されます。"
      >
        <div className="flex flex-col gap-4">
          <Input
            label='確認のため「削除する」と入力してください'
            value={deleteConfirm}
            onChange={(e) => setDeleteConfirm(e.target.value)}
            placeholder="削除する"
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setDeleteConfirm("");
              }}
            >
              キャンセル
            </Button>
            <Button
              variant="destructive"
              disabled={deleteConfirm !== "削除する"}
              onClick={handleDeleteAccount}
            >
              アカウントを削除
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
