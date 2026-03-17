import { notFound, redirect } from "next/navigation";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/header";
import type {
  ReportContent,
  ReportStatus,
  DailyReport,
  UserWorkspaceMembership,
  Workspace,
} from "@/lib/supabase/types";
import { DEFAULT_TEMPLATE, type ReportTemplate } from "@/lib/report-template";

import { ReportEditor } from "./report-editor";

// ---------------------------------------------------------------------------
// Types shared between server and client
// ---------------------------------------------------------------------------

export interface ReportData {
  id: string;
  reportDate: string; // formatted display string
  status: ReportStatus;
  content: ReportContent;
  template: ReportTemplate;
  workspaceId: string;
  workspaceName: string;
  plan: string;
}

// ---------------------------------------------------------------------------
// Page component (Server Component)
// ---------------------------------------------------------------------------

interface ReportDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ReportDetailPage({
  params,
}: ReportDetailPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  // ---------- Auth ----------
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // ---------- Fetch report ----------
  const { data: rawReport, error } = await supabase
    .from("daily_reports")
    .select("id, report_date, status, content, user_id, workspace_id")
    .eq("id", id)
    .single();

  if (error || !rawReport) {
    notFound();
  }

  const report = rawReport as unknown as Pick<
    DailyReport,
    "id" | "report_date" | "status" | "content" | "user_id" | "workspace_id"
  >;

  // ---------- Authorization: check workspace membership ----------
  const { data: rawMembership } = await supabase
    .from("user_workspace_memberships")
    .select("role")
    .eq("user_id", user.id)
    .eq("workspace_id", report.workspace_id)
    .single();

  const membership = rawMembership as unknown as Pick<
    UserWorkspaceMembership,
    "role"
  > | null;

  if (!membership) {
    notFound();
  }

  // Non-admin can only see their own reports
  if (membership.role !== "admin" && report.user_id !== user.id) {
    notFound();
  }

  // ---------- Fetch workspace template ----------
  const { data: rawWorkspace } = await supabase
    .from("workspaces")
    .select("name, report_template, plan")
    .eq("id", report.workspace_id)
    .single();

  const workspace = rawWorkspace as Pick<Workspace, "name" | "report_template" | "plan"> | null;
  const template = workspace?.report_template ?? DEFAULT_TEMPLATE;
  const plan = workspace?.plan ?? "free";

  // ---------- Format for client ----------
  // Initialize empty arrays for any template sections missing from content
  const content: ReportContent = {};
  for (const section of template) {
    content[section.key] = (report.content as ReportContent)?.[section.key] ?? [];
  }

  const reportData: ReportData = {
    id: report.id,
    reportDate: format(
      new Date(report.report_date + "T00:00:00"),
      "yyyy年M月d日（E）",
      { locale: ja },
    ),
    status: report.status,
    content,
    template,
    workspaceId: report.workspace_id,
    workspaceName: workspace?.name ?? "",
    plan,
  };

  return (
    <div>
      <Header title="日報詳細" />
      <ReportEditor initialReport={reportData} plan={plan} />
    </div>
  );
}
