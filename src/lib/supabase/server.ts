import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from './types';

// Server-side Supabase client (Server Components / Route Handlers) — reads the session from
// the request's cookies, refreshed by src/proxy.ts on every navigation. Used only to find out
// *who* is calling (auth.getUser()); actual data reads/writes still go through the
// service-role client in admin-server.ts.
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
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Called from a Server Component render, where cookies can't be mutated —
            // harmless as long as src/proxy.ts is also refreshing the session.
          }
        },
      },
    },
  );
}
