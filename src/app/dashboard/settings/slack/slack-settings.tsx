"use client";

import { useState, useCallback } from "react";
import {
  MessageSquare,
  CheckCircle,
  AlertCircle,
  Hash,
  Lock,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import type { SlackIntegration } from "@/lib/supabase/types";

interface SlackChannel {
  id: string;
  name: string;
  is_private: boolean;
  num_members: number;
}

interface SlackSettingsProps {
  workspaceId: string;
  slackIntegration: Pick<
    SlackIntegration,
    "id" | "slack_team_name" | "selected_channel_ids"
  > | null;
  isAdmin: boolean;
}

export function SlackSettings({
  workspaceId,
  slackIntegration,
  isAdmin,
}: SlackSettingsProps) {
  const { toast } = useToast();

  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [channelDialogOpen, setChannelDialogOpen] = useState(false);
  const [channels, setChannels] = useState<SlackChannel[]>([]);
  const [isLoadingChannels, setIsLoadingChannels] = useState(false);
  const [selectedChannelIds, setSelectedChannelIds] = useState<Set<string>>(
    new Set(slackIntegration?.selected_channel_ids ?? []),
  );
  const [isSavingChannels, setIsSavingChannels] = useState(false);

  const handleConnectSlack = () => {
    window.location.href = `/api/slack/oauth?workspace_id=${workspaceId}`;
  };

  const handleDisconnectSlack = async () => {
    if (!isAdmin) {
      toast("管理者のみSlack連携を解除できます", "error");
      return;
    }

    if (!slackIntegration) return;

    setIsDisconnecting(true);
    try {
      const res = await fetch(
        `/api/slack/integrations/${slackIntegration.id}`,
        {
          method: "DELETE",
        },
      );

      if (!res.ok) {
        const data = await res.json();
        toast(data.error ?? "Slack連携の解除に失敗しました", "error");
        return;
      }

      toast("Slack連携を解除しました", "success");
      window.location.reload();
    } catch {
      toast("Slack連携の解除に失敗しました", "error");
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleOpenChannelDialog = useCallback(async () => {
    if (!slackIntegration) return;

    setChannelDialogOpen(true);
    setIsLoadingChannels(true);
    setSelectedChannelIds(
      new Set(slackIntegration.selected_channel_ids ?? []),
    );

    try {
      const res = await fetch(
        `/api/slack/channels?workspace_id=${workspaceId}`,
      );
      const data = await res.json();

      if (!res.ok) {
        toast(data.error ?? "チャンネルの取得に失敗しました", "error");
        setChannelDialogOpen(false);
        return;
      }

      setChannels(data.channels as SlackChannel[]);
    } catch {
      toast("チャンネルの取得に失敗しました", "error");
      setChannelDialogOpen(false);
    } finally {
      setIsLoadingChannels(false);
    }
  }, [slackIntegration, workspaceId, toast]);

  const handleToggleChannel = (channelId: string) => {
    setSelectedChannelIds((prev) => {
      const next = new Set(prev);
      if (next.has(channelId)) {
        next.delete(channelId);
      } else {
        next.add(channelId);
      }
      return next;
    });
  };

  const handleSaveChannels = async () => {
    if (!slackIntegration) return;

    setIsSavingChannels(true);
    try {
      const res = await fetch(
        `/api/slack/integrations/${slackIntegration.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            selected_channel_ids: Array.from(selectedChannelIds),
          }),
        },
      );

      if (!res.ok) {
        const data = await res.json();
        toast(data.error ?? "チャンネル設定の保存に失敗しました", "error");
        return;
      }

      toast("チャンネル設定を保存しました", "success");
      setChannelDialogOpen(false);
      window.location.reload();
    } catch {
      toast("チャンネル設定の保存に失敗しました", "error");
    } finally {
      setIsSavingChannels(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-gray-400" />
            <CardTitle>Slack連携</CardTitle>
          </div>
          <CardDescription>
            Slackワークスペースとの連携状態を管理します。
          </CardDescription>
        </CardHeader>
        <CardContent>
          {slackIntegration ? (
            <>
              <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-medium text-green-800">連携済み</p>
                    <p className="mt-0.5 text-sm text-green-700">
                      ワークスペース:{" "}
                      {slackIntegration.slack_team_name ?? "不明"}
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-700">
                  連携チャンネル
                </h4>
                {slackIntegration.selected_channel_ids.length > 0 ? (
                  <p className="mt-1 text-sm text-gray-500">
                    {slackIntegration.selected_channel_ids.length}{" "}
                    チャンネルが選択されています
                  </p>
                ) : (
                  <p className="mt-1 text-sm text-gray-500">
                    チャンネルが未設定です。日報生成にはチャンネルの選択が必要です。
                  </p>
                )}
              </div>
              {isAdmin && (
                <div className="mt-4 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleOpenChannelDialog}
                  >
                    <Hash className="mr-1.5 h-3.5 w-3.5" />
                    チャンネルを設定
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:bg-red-50 hover:text-red-700"
                    onClick={handleDisconnectSlack}
                    disabled={isDisconnecting}
                  >
                    {isDisconnecting ? "解除中..." : "連携を解除"}
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="font-medium text-gray-700">未連携</p>
                  <p className="mt-0.5 text-sm text-gray-500">
                    Slackと連携すると、チャンネルのメッセージからAIが日報を自動生成します。
                  </p>
                </div>
              </div>
              {isAdmin && (
                <div className="mt-4">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleConnectSlack}
                  >
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Slackと連携する
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Channel selection dialog */}
      <Dialog
        open={channelDialogOpen}
        onClose={() => setChannelDialogOpen(false)}
        title="チャンネルを選択"
        description="日報生成に使用するSlackチャンネルを選択してください。"
        className="max-w-lg"
      >
        <div className="flex flex-col gap-4">
          {isLoadingChannels ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              <span className="ml-2 text-sm text-gray-500">
                チャンネルを読み込み中...
              </span>
            </div>
          ) : (
            <>
              <div className="max-h-80 overflow-y-auto rounded-lg border border-gray-200">
                {channels.length === 0 ? (
                  <div className="p-4 text-center text-sm text-gray-500">
                    チャンネルが見つかりませんでした。ボットがチャンネルに招待されているか確認してください。
                  </div>
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {channels.map((channel) => (
                      <li key={channel.id}>
                        <label className="flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-gray-50">
                          <input
                            type="checkbox"
                            checked={selectedChannelIds.has(channel.id)}
                            onChange={() => handleToggleChannel(channel.id)}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <div className="flex min-w-0 flex-1 items-center gap-2">
                            {channel.is_private ? (
                              <Lock className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
                            ) : (
                              <Hash className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
                            )}
                            <span className="truncate text-sm font-medium text-gray-900">
                              {channel.name}
                            </span>
                          </div>
                          <span className="flex-shrink-0 text-xs text-gray-400">
                            {channel.num_members}人
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <p className="text-xs text-gray-500">
                {selectedChannelIds.size} チャンネル選択中
              </p>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setChannelDialogOpen(false)}
                >
                  キャンセル
                </Button>
                <Button
                  onClick={handleSaveChannels}
                  disabled={isSavingChannels}
                >
                  {isSavingChannels ? "保存中..." : "保存"}
                </Button>
              </div>
            </>
          )}
        </div>
      </Dialog>
    </>
  );
}
