"use client";

import { useState } from "react";
import { UserPlus, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";

interface TeamActionsProps {
  workspaceId: string;
  isAdmin: boolean;
}

export function TeamActions({ workspaceId, isAdmin }: TeamActionsProps) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  if (!isAdmin) {
    return null;
  }

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!inviteEmail.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim(), role: "member" }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast(data.error ?? "招待に失敗しました", "error");
        return;
      }

      toast(`${inviteEmail} を招待しました`, "success");
      setInviteEmail("");
      setInviteOpen(false);
    } catch {
      toast("招待の送信に失敗しました", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Button onClick={() => setInviteOpen(true)}>
        <UserPlus className="mr-2 h-4 w-4" />
        メンバーを招待
      </Button>

      <Dialog
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        title="メンバーを招待"
        description="招待メールを送信して、チームにメンバーを追加します。"
      >
        <form onSubmit={handleInvite} className="flex flex-col gap-4">
          <Input
            label="メールアドレス"
            type="email"
            placeholder="colleague@example.com"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            required
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              type="button"
              onClick={() => setInviteOpen(false)}
            >
              キャンセル
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              <Mail className="mr-2 h-4 w-4" />
              {isSubmitting ? "送信中..." : "招待を送信"}
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
