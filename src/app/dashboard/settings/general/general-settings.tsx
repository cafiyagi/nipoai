"use client";

import { useState } from "react";
import { Settings } from "lucide-react";
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
import type { Workspace } from "@/lib/supabase/types";

interface GeneralSettingsProps {
  workspace: Workspace;
  isAdmin: boolean;
}

export function GeneralSettings({ workspace, isAdmin }: GeneralSettingsProps) {
  const { toast } = useToast();

  const [workspaceName, setWorkspaceName] = useState(workspace.name);
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAdmin) {
      toast("管理者のみ設定を変更できます", "error");
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch(`/api/workspaces/${workspace.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: workspaceName,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast(data.error ?? "設定の保存に失敗しました", "error");
        return;
      }

      toast("ワークスペース設定を保存しました", "success");
    } catch {
      toast("設定の保存に失敗しました", "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-gray-400" />
          <CardTitle>ワークスペース設定</CardTitle>
        </div>
        <CardDescription>
          ワークスペースの基本設定を管理します。
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!isAdmin && (
          <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3">
            <p className="text-sm text-blue-700">
              この設定は管理者のみ変更できます。
            </p>
          </div>
        )}
        <form onSubmit={handleSaveWorkspace} className="flex flex-col gap-4">
          <Input
            label="ワークスペース名"
            value={workspaceName}
            onChange={(e) => setWorkspaceName(e.target.value)}
            disabled={!isAdmin}
          />
          {isAdmin && (
            <div className="flex justify-end">
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "保存中..." : "保存"}
              </Button>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
