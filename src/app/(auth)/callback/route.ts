import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Profile } from "@/lib/supabase/types";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        // Sync OAuth display_name
        const oauthName =
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.user_metadata?.display_name ||
          null;

        if (oauthName) {
          const { data: rawProfile } = await supabase
            .from("profiles")
            .select("display_name")
            .eq("id", user.id)
            .single();

          const existingProfile = rawProfile as unknown as Pick<
            Profile,
            "display_name"
          > | null;

          if (existingProfile && !existingProfile.display_name) {
            await supabase
              .from("profiles")
              .update({ display_name: oauthName } as never)
              .eq("id", user.id);
          }
        }

        // Auto-accept pending workspace invitations
        await acceptPendingInvitations(user.id, user.email ?? "");
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}

async function acceptPendingInvitations(userId: string, email: string) {
  if (!email) return;

  try {
    const admin = createAdminClient();

    const { data: invitations } = await admin
      .from("workspace_invitations")
      .select("id, workspace_id, role")
      .eq("email", email.toLowerCase())
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString());

    if (!invitations || invitations.length === 0) return;

    for (const invite of invitations) {
      const inv = invite as { id: string; workspace_id: string; role: string };

      // Check not already a member
      const { data: existing } = await admin
        .from("user_workspace_memberships")
        .select("id")
        .eq("user_id", userId)
        .eq("workspace_id", inv.workspace_id)
        .single();

      if (existing) {
        // Already a member, mark invitation as accepted
        await admin
          .from("workspace_invitations")
          .update({ status: "accepted" } as never)
          .eq("id", inv.id);
        continue;
      }

      // Add to workspace
      await admin.from("user_workspace_memberships").insert({
        user_id: userId,
        workspace_id: inv.workspace_id,
        role: inv.role,
      } as never);

      // Mark invitation as accepted
      await admin
        .from("workspace_invitations")
        .update({ status: "accepted" } as never)
        .eq("id", inv.id);
    }
  } catch (err) {
    console.error("Failed to accept pending invitations:", err);
  }
}
