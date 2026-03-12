"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AuthResult {
  error?: string;
}

// ---------------------------------------------------------------------------
// Email + Password Sign In
// ---------------------------------------------------------------------------

export async function signInWithEmail(
  email: string,
  password: string,
): Promise<AuthResult> {
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  redirect("/dashboard");
}

// ---------------------------------------------------------------------------
// Email + Password Sign Up
// ---------------------------------------------------------------------------

export async function signUpWithEmail(
  email: string,
  password: string,
  name: string,
): Promise<AuthResult> {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: name,
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  // If email confirmation is required, the user object exists but
  // identities may be empty. In that case, redirect to a confirmation page.
  if (data.user && data.user.identities?.length === 0) {
    return {
      error:
        "このメールアドレスは既に登録されています。ログインページからお試しください。",
    };
  }

  // Update the profiles table with the display name.
  // The Supabase trigger should have created the profile row via
  // `on_auth_user_created`, but we update display_name explicitly.
  if (data.user) {
    await supabase
      .from("profiles")
      .update({ display_name: name } as never)
      .eq("id", data.user.id);
  }

  // If email confirmation is enabled and the session is null,
  // the user needs to verify their email first.
  if (!data.session) {
    redirect("/login?message=confirm_email");
  }

  redirect("/dashboard");
}

// ---------------------------------------------------------------------------
// Sign Out
// ---------------------------------------------------------------------------

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
