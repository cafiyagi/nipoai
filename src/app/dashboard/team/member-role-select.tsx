"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";

interface MemberRoleSelectProps {
  workspaceId: string;
  membershipId: string;
  memberName: string;
  currentRole: "admin" | "member";
  isSelf: boolean;
  isAdmin: boolean;
}

export function MemberRoleSelect({
  workspaceId,
  membershipId,
  memberName,
  currentRole,
  isSelf,
  isAdmin,
}: MemberRoleSelectProps) {
  const [role, setRole] = useState(currentRole);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const apiUrl = `/api/workspaces/${workspaceId}/members/${membershipId}`;

  const handleChange = async (newRole: string) => {
    if (newRole === role) return;

    setLoading(true);
    try {
      const res = await fetch(apiUrl, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast(data.error ?? "ロールの変更に失敗しました", "error");
        return;
      }

      setRole(newRole as "admin" | "member");
      toast("ロールを変更しました", "success");
      router.refresh();
    } catch {
      toast("ロールの変更に失敗しました", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async () => {
    if (!confirm(`${memberName} をチームから削除しますか？`)) return;

    setLoading(true);
    try {
      const res = await fetch(apiUrl, { method: "DELETE" });
      const data = await res.json();

      if (!res.ok) {
        toast(data.error ?? "メンバーの削除に失敗しました", "error");
        return;
      }

      toast(`${memberName} を削除しました`, "success");
      router.refresh();
    } catch {
      toast("メンバーの削除に失敗しました", "error");
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin || isSelf) {
    return (
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
          role === "admin"
            ? "bg-blue-50 text-blue-700"
            : "bg-gray-100 text-gray-600"
        }`}
      >
        {role === "admin" ? "管理者" : "メンバー"}
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={role}
        onChange={(e) => handleChange(e.target.value)}
        disabled={loading}
        className="h-8 rounded-lg border border-gray-300 bg-white px-2 text-xs font-medium text-gray-700 transition-colors hover:border-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50"
      >
        <option value="admin">管理者</option>
        <option value="member">メンバー</option>
      </select>
      <button
        onClick={handleRemove}
        disabled={loading}
        className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
        title="メンバーを削除"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}
