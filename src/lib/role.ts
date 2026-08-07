// SERVER ONLY. The single place that decides "who is calling, and are they a manager?".
//
// Every signed-in Supabase user in this tool is legitimate internal staff (proxy.ts requires
// a session for every route) — the only question is which of two roles they hold. Role lives
// in public.profiles.role, defaulting to 'staff'; promoting someone to 'manager' is a manual
// SQL update (see the note atop supabase/schema.sql) — there's no admin UI for it yet.
//
// Profile rows are provisioned lazily here (upsert on first check) rather than via a
// database trigger on auth.users — one less moving part to keep in sync with the schema.
//
// Deliberately fails closed: if nobody is signed in, callers get null and must refuse the
// request rather than assume a role.
import { createClient as createServerSupabase } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin-server';
import type { Role } from '@/types/company';

export type Identity = { userId: string; email: string; name: string; role: Role };

export async function getIdentity(): Promise<Identity | null> {
  const supabase = await createServerSupabase();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) return null;

  const email = user.email ?? '';
  const admin = createAdminClient();
  // Plain upsert (not ignoreDuplicates): on conflict this only rewrites `email`, since that's
  // the only column in the payload — the existing `role` is left untouched. ignoreDuplicates
  // would skip the write on conflict, but then PostgREST returns no row for `.select()` to see.
  const { data: profile } = await admin
    .from('profiles')
    .upsert({ id: user.id, email }, { onConflict: 'id' })
    .select('role')
    .single();
  const role: Role = profile?.role === 'manager' ? 'manager' : 'staff';

  return { userId: user.id, email, name: email || 'Unknown', role };
}

export async function requireManager(): Promise<Identity | null> {
  const identity = await getIdentity();
  return identity?.role === 'manager' ? identity : null;
}
