import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import type { Database } from "./types";

/**
 * Create a Supabase client for use in Server Components, Server Actions,
 * and Route Handlers.
 *
 * The client reads and writes auth tokens via the cookie store so that
 * sessions stay in sync with the middleware and browser client.
 *
 * This function is async because `cookies()` returns a Promise in
 * Next.js 15 App Router.
 *
 * Usage (Server Component):
 *   const supabase = await createClient();
 *   const { data } = await supabase.from("workspaces").select("*");
 *
 * Usage (Route Handler):
 *   export async function GET() {
 *     const supabase = await createClient();
 *     ...
 *   }
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // setAll is called from a Server Component where cookies
            // cannot be written. The middleware will handle the refresh
            // on the next request instead.
          }
        },
      },
    },
  );
}
