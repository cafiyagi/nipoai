import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isSuperAdmin } from "@/lib/auth/admin";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, path, referrer } = body;

    if (!sessionId || !path) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // Skip tracking for super admins
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user && isSuperAdmin(user.email)) {
        return NextResponse.json({ ok: true });
      }
    } catch {
      // Auth check failed — continue tracking (visitor is likely unauthenticated)
    }

    const ua = req.headers.get("user-agent") ?? null;
    const country = req.headers.get("x-vercel-ip-country") ?? null;

    const admin = createAdminClient();
    // page_views table not in generated types yet — use rpc-style insert
    await (admin as unknown as { from: (table: string) => { insert: (row: Record<string, unknown>) => Promise<unknown> } })
      .from("page_views")
      .insert({
        session_id: sessionId,
        path,
        referrer: referrer || null,
        user_agent: ua,
        country,
      });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
