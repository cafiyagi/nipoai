"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface AdminUserDeleteButtonProps {
  userId: string;
  displayName: string;
}

export function AdminUserDeleteButton({
  userId,
  displayName,
}: AdminUserDeleteButtonProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    // Step 1: First confirmation
    if (
      !confirm(
        `${displayName}を削除しますか？関連するすべてのデータ（日報、ワークスペースメンバーシップ等）も削除されます。`,
      )
    )
      return;

    setLoading(true);
    try {
      // Step 2: Request confirmation token from API
      const res1 = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      if (!res1.ok) {
        const data = await res1.json();
        alert(data.error ?? "ユーザーの削除に失敗しました");
        return;
      }

      const data1 = await res1.json();

      if (!data1.requireConfirmation || !data1.confirmToken) {
        // Unexpected response
        alert("予期しないレスポンスです。もう一度やり直してください。");
        return;
      }

      // Step 3: Second confirmation
      if (
        !confirm(
          `本当に${displayName}を削除しますか？この操作は取り消せません。`,
        )
      ) {
        return;
      }

      // Step 4: Send confirmed delete with token
      const res2 = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmToken: data1.confirmToken }),
      });

      if (!res2.ok) {
        const data2 = await res2.json();
        alert(data2.error ?? "ユーザーの削除に失敗しました");
        return;
      }

      router.refresh();
    } catch {
      alert("ユーザーの削除に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="rounded-lg p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--danger-bg)] hover:text-[var(--danger)] disabled:opacity-50"
      title="ユーザーを削除"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}
