"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";

interface MemberRoleSelectProps {
  workspaceId: string;
  membershipId: string;
  currentRole: "admin" | "member";
  isSelf: boolean;
  isAdmin: boolean;
}

export function MemberRoleSelect({
  workspaceId,
  membershipId,
  currentRole,
  isSelf,
  isAdmin,
}: MemberRoleSelectProps) {
  const [role, setRole] = useState(currentRole);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const handleChange = async (newRole: string) => {
    if (newRole === role) return;

    setLoading(true);
    try {
      const res = await fetch(
        `/api/workspaces/${workspaceId}/members/${membershipId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: newRole }),
        },
      );

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
    <select
      value={role}
      onChange={(e) => handleChange(e.target.value)}
      disabled={loading}
      className="h-8 rounded-lg border border-gray-300 bg-white px-2 text-xs font-medium text-gray-700 transition-colors hover:border-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50"
    >
      <option value="admin">管理者</option>
      <option value="member">メンバー</option>
    </select>
  );
}
