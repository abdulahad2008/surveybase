import { createClient } from "@supabase/supabase-js";
import { supabaseUrl, supabaseServiceRoleKey } from "./env";

// Service-role client — bypasses RLS. Server-only: it reads
// SUPABASE_SERVICE_ROLE_KEY, which has no NEXT_PUBLIC_ prefix and is therefore
// never bundled for the browser (importing this client-side throws
// MissingSupabaseEnvError). Never expose its results directly. Used for
// infrastructure checks (health endpoint) and other privileged operations.
export function createAdminClient() {
  return createClient(supabaseUrl(), supabaseServiceRoleKey(), {
    auth: { persistSession: false },
  });
}
