import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { UserWorkspaceMembership, WorkspaceUpdate } from "@/lib/supabase/types";
import { validateTemplate } from "@/lib/report-template";

interface RouteContext {
  params: Promise<{ id: string }>;
}

const VALID_TIMES = [
  "17:00",
  "17:30",
  "18:00",
  "18:30",
  "19:00",
  "19:30",
  "20:00",
];

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id: workspaceId } = await context.params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can update workspace settings
    const { data: rawMembership } = await supabase
      .from("user_workspace_memberships")
      .select("role")
      .eq("user_id", user.id)
      .eq("workspace_id", workspaceId)
      .single();

    const membership = rawMembership as Pick<
      UserWorkspaceMembership,
      "role"
    > | null;

    if (!membership || membership.role !== "admin") {
      return NextResponse.json(
        { error: "Only workspace admins can update settings" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { name, report_generation_time, report_template } = body as {
      name?: string;
      report_generation_time?: string;
      report_template?: unknown;
    };

    const updates: WorkspaceUpdate = {};

    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length === 0) {
        return NextResponse.json(
          { error: "Workspace name cannot be empty" },
          { status: 400 },
        );
      }
      if (name.trim().length > 100) {
        return NextResponse.json(
          { error: "Workspace name must be 100 characters or less" },
          { status: 400 },
        );
      }
      updates.name = name.trim();
    }

    if (report_generation_time !== undefined) {
      if (!VALID_TIMES.includes(report_generation_time)) {
        return NextResponse.json(
          {
            error: `Invalid report_generation_time. Must be one of: ${VALID_TIMES.join(", ")}`,
          },
          { status: 400 },
        );
      }
      updates.report_generation_time = report_generation_time;
    }

    if (report_template !== undefined) {
      const validated = validateTemplate(report_template);
      if (!validated) {
        return NextResponse.json(
          { error: "Invalid report template format" },
          { status: 400 },
        );
      }
      updates.report_template = validated;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 },
      );
    }

    const { data: workspace, error } = await supabase
      .from("workspaces")
      .update(updates as never)
      .eq("id", workspaceId)
      .select()
      .single();

    if (error) {
      console.error("Failed to update workspace:", error);
      return NextResponse.json(
        { error: "Failed to update workspace" },
        { status: 500 },
      );
    }

    return NextResponse.json({ workspace });
  } catch (error) {
    console.error("PATCH /api/workspaces/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
