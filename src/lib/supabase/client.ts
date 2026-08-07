import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './types';

// Browser-side Supabase client — used only for Auth (sign in/up/out, reading the session) and
// reading a user's own row from `profiles`. Every other table (companies, activity_log) is
// read/written exclusively through Route Handlers with the service-role key — see
// src/lib/supabase/admin-server.ts.
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
