import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import type { Database } from "./types";

/**
 * Create a Supabase admin client that bypasses Row-Level Security.
 *
 * This client uses the SUPABASE_SERVICE_ROLE_KEY and must NEVER be
 * exposed to the browser. Use it exclusively in:
 *
 *   - Webhook handlers  (`/api/webhooks/*`)
 *   - Cron jobs          (`/api/cron/*`)
 *   - Server-side admin  operations
 *
 * The client is lazily instantiated per call so that the environment
 * variables are read at runtime, not at module load time.
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. " +
        "These environment variables are required for the admin client.",
    );
  }

  return createSupabaseClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
