import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "./types";

/**
 * Create a Supabase client for use in Browser / Client Components.
 *
 * This client automatically stores the session in cookies via the
 * @supabase/ssr package and shares the session with the middleware
 * and Server Components.
 *
 * Usage:
 *   const supabase = createClient();
 *   const { data } = await supabase.from("workspaces").select("*");
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
