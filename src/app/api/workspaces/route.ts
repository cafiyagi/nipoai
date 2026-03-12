import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getResendClient } from "@/lib/email/client";
import { buildWelcomeEmail } from "@/lib/email/templates";
import type {
  Workspace,
  WorkspaceInsert,
  UserWorkspaceMembershipInsert,
  UserWorkspaceMembership,
} from "@/lib/supabase/types";

function generateSlug(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);

  const suffix = randomBytes(4).toString("hex");
  return base ? `${base}-${suffix}` : suffix;
}

type MembershipWithWorkspace = UserWorkspaceMembership & {
  workspaces: Workspace;
};

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get workspaces the user belongs to, with their role
    const { data: rawMemberships, error } = await supabase
      .from("user_workspace_memberships")
      .select("role, workspaces(*)")
      .eq("user_id", user.id);

    if (error) {
      console.error("Failed to fetch workspaces:", error);
      return NextResponse.json(
        { error: "Failed to fetch workspaces" },
        { status: 500 },
      );
    }

    const memberships =
      (rawMemberships ?? []) as unknown as MembershipWithWorkspace[];

    const workspaces = memberships.map((m) => ({
      ...m.workspaces,
      role: m.role,
    }));

    return NextResponse.json({ workspaces });
  } catch (error) {
    console.error("GET /api/workspaces error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name } = body as { name?: string };

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Workspace name is required" },
        { status: 400 },
      );
    }

    if (name.trim().length > 100) {
      return NextResponse.json(
        { error: "Workspace name must be 100 characters or less" },
        { status: 400 },
      );
    }

    const slug = generateSlug(name.trim());

    // Use admin client for both workspace creation and membership insertion
    // to bypass RLS chicken-and-egg problem (user has no membership yet)
    const admin = createAdminClient();

    // Create workspace
    const wsRow: WorkspaceInsert = {
      name: name.trim(),
      slug,
      plan: "free",
    };

    const { data: workspace, error: wsError } = await admin
      .from("workspaces")
      .insert(wsRow as never)
      .select()
      .single();

    if (wsError) {
      console.error("Failed to create workspace:", wsError);
      if (wsError.code === "23505") {
        return NextResponse.json(
          { error: "Please try again (slug collision)" },
          { status: 409 },
        );
      }
      return NextResponse.json(
        { error: "Failed to create workspace" },
        { status: 500 },
      );
    }

    const ws = workspace as unknown as Workspace;

    // Add the creator as admin
    const memberRow: UserWorkspaceMembershipInsert = {
      user_id: user.id,
      workspace_id: ws.id,
      role: "admin",
    };

    const { error: memberError } = await admin
      .from("user_workspace_memberships")
      .insert(memberRow as never);

    if (memberError) {
      console.error("Failed to add creator as admin:", memberError);
      await admin.from("workspaces").delete().eq("id", ws.id);
      return NextResponse.json(
        { error: "Failed to set up workspace" },
        { status: 500 },
      );
    }

    // Send welcome email (fire-and-forget — never block workspace creation)
    const resend = getResendClient();
    if (resend && user.email) {
      const { subject, html } = buildWelcomeEmail({
        workspaceName: ws.name,
      });

      resend.emails
        .send({
          from: "NipoAI <onboarding@resend.dev>",
          to: user.email,
          subject,
          html,
        })
        .then((result) => {
          if (result.error) {
            console.error("[email] Failed to send welcome email:", result.error);
          }
        })
        .catch((err) => {
          console.error("[email] Welcome email send error:", err);
        });
    }

    return NextResponse.json({ workspace: ws }, { status: 201 });
  } catch (error) {
    console.error("POST /api/workspaces error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
