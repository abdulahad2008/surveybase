// Fail-loud env resolution for Supabase.
//
// Every Supabase client factory (browser/server/middleware) previously read
// `process.env.X!` with a non-null assertion, so a misconfigured deploy would
// surface as a vague runtime crash deep inside the SDK. These helpers throw a
// single, named, actionable error the moment a required variable is missing.

export class MissingSupabaseEnvError extends Error {
  constructor(varName: string) {
    super(
      `Missing required environment variable ${varName}. ` +
        `Set it in .env.local (local dev) or the Vercel project settings (production).`,
    );
    this.name = "MissingSupabaseEnvError";
  }
}

function required(varName: string, value: string | undefined): string {
  if (!value) throw new MissingSupabaseEnvError(varName);
  return value;
}

export function supabaseUrl(): string {
  return required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);
}

export function supabaseAnonKey(): string {
  return required("NEXT_PUBLIC_SUPABASE_ANON_KEY", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

/** Server-only. Never import into a client component. */
export function supabaseServiceRoleKey(): string {
  return required("SUPABASE_SERVICE_ROLE_KEY", process.env.SUPABASE_SERVICE_ROLE_KEY);
}
