// SERVER ONLY. Never import this from a client component.
//
// This app has no browser-side Supabase client at all: every page and mutation goes through a
// Next.js Route Handler that first checks the caller's Clerk session (src/lib/role.ts), then
// talks to Postgres with the service-role key, which bypasses RLS entirely. See the note atop
// supabase/schema.sql for why — RLS has no policies for anon/authenticated, so the service-role
// key is the only way in or out.
import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';

export class MissingServiceRoleKeyError extends Error {
  constructor() {
    super(
      'SUPABASE_SERVICE_ROLE_KEY is not set. Add it to .env.local from Supabase → Project ' +
        'Settings → API Keys → service_role. Keep it server-side only — never prefix it with NEXT_PUBLIC_.',
    );
    this.name = 'MissingServiceRoleKeyError';
  }
}

export function createAdminClient(): SupabaseClient<Database> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set.');
  if (!serviceKey) throw new MissingServiceRoleKeyError();

  return createSupabaseClient<Database>(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
