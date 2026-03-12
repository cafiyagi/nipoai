import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/supabase/types";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // After a successful OAuth exchange, sync the profile display_name
      // from the OAuth provider metadata (e.g. Google full_name).
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const oauthName =
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.user_metadata?.display_name ||
          null;

        if (oauthName) {
          // Upsert: only set display_name if it is currently null
          const { data: rawProfile } = await supabase
            .from("profiles")
            .select("display_name")
            .eq("id", user.id)
            .single();

          const existingProfile = rawProfile as unknown as Pick<Profile, "display_name"> | null;

          if (existingProfile && !existingProfile.display_name) {
            await supabase
              .from("profiles")
              .update({ display_name: oauthName } as never)
              .eq("id", user.id);
          }
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Auth code exchange failed -- redirect to login with error
  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
