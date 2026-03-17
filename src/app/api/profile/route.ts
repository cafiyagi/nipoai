import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);

    if (!body || typeof body.display_name !== "string") {
      return NextResponse.json(
        { error: "display_name is required" },
        { status: 400 },
      );
    }

    const displayName = body.display_name.trim();

    if (displayName.length > 100) {
      return NextResponse.json(
        { error: "display_name is too long (max 100)" },
        { status: 400 },
      );
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ display_name: displayName || null } as never)
      .eq("id", user.id);

    if (updateError) {
      console.error("Failed to update profile:", updateError);
      return NextResponse.json(
        { error: "Failed to update profile" },
        { status: 500 },
      );
    }

    return NextResponse.json({ display_name: displayName });
  } catch (error) {
    console.error("PATCH /api/profile error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
