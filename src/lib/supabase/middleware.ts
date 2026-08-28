import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import type { NextRequest, NextResponse } from "next/server";
import { supabaseUrl, supabaseAnonKey } from "./env";

export async function updateSession(
  request: NextRequest,
  response: NextResponse,
): Promise<{ response: NextResponse; user: User | null }> {
  const supabase = createServerClient(
    supabaseUrl(),
    supabaseAnonKey(),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Refresh the auth session so Server Components see an up-to-date user.
  // Returned as well as refreshed: the proxy needs the answer to decide
  // whether a protected page should be rendered at all, and asking twice
  // would mean two round-trips to Supabase on every request.
  const { data } = await supabase.auth.getUser();

  return { response, user: data.user };
}
