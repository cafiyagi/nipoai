"use client";

import { useState } from "react";
import { Trash2, Loader2 } from "lucide-react";

interface ReportDeleteButtonProps {
  reportId: string;
  status: string;
  onDeleted?: (reportId: string) => void;
}

export function ReportDeleteButton({ reportId, status, onDeleted }: ReportDeleteButtonProps) {
  const [deleting, setDeleting] = useState(false);

  if (status !== "draft" && status !== "generating") {
    return null;
  }

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm("この日報を削除しますか？")) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/reports/${reportId}`, { method: "DELETE" });
      if (res.ok) {
        onDeleted?.(reportId);
      }
    } catch {
      // ignore
    } finally {
      setDeleting(false);
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={deleting}
      className="shrink-0 rounded-md p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
      title="削除"
    >
      {deleting ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Trash2 className="h-4 w-4" />
      )}
    </button>
  );
}
