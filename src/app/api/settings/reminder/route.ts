import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkPlanFeature } from "@/lib/plan-gate";
import type { Plan, UserWorkspaceMembership } from "@/lib/supabase/types";

const VALID_TIME_PATTERN = /^([01]\d|2[0-3]):(00|15|30|45)$/;

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get membership + workspace in one query
    const { data: rawMembership } = await supabase
      .from("user_workspace_memberships")
      .select("workspace_id, role, workspaces(plan)")
      .eq("user_id", user.id)
      .limit(1)
      .single();

    if (!rawMembership) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    const membership = rawMembership as unknown as Pick<
      UserWorkspaceMembership,
      "workspace_id" | "role"
    > & { workspaces: { plan: Plan } };

    if (membership.role !== "admin") {
      return NextResponse.json(
        { error: "Only workspace admins can update reminder settings" },
        { status: 403 },
      );
    }

    // Plan gate
    const plan = membership.workspaces.plan;
    if (!checkPlanFeature(plan, "autoReminder")) {
      return NextResponse.json(
        { error: "この機能はStarterプラン以上でご利用いただけます" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { reminder_enabled, reminder_time } = body as {
      reminder_enabled?: boolean;
      reminder_time?: string;
    };

    const updates: { reminder_enabled?: boolean; reminder_time?: string } = {};

    if (typeof reminder_enabled === "boolean") {
      updates.reminder_enabled = reminder_enabled;
    }

    if (reminder_time !== undefined) {
      if (typeof reminder_time !== "string" || !VALID_TIME_PATTERN.test(reminder_time)) {
        return NextResponse.json(
          { error: "Invalid reminder_time. Use HH:MM format (15-minute intervals)" },
          { status: 400 },
        );
      }
      updates.reminder_time = reminder_time;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 },
      );
    }

    const { error } = await supabase
      .from("workspaces")
      .update(updates as never)
      .eq("id", membership.workspace_id);

    if (error) {
      console.error("[settings/reminder] Update failed:", error);
      return NextResponse.json(
        { error: "Failed to update reminder settings" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[settings/reminder] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
