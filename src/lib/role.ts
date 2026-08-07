// SERVER ONLY. The single place that decides "is this caller a Procurement Manager?".
//
// Every signed-in Clerk user in this tool is legitimate internal staff (proxy.ts requires a
// session for every route) — the only question is which of two roles they hold. Role comes
// from Clerk user metadata: in the Clerk dashboard, open the user and save
// { "role": "manager" } into "Public metadata" (or "Private metadata" — checked either way).
// Anyone without that metadata defaults to 'staff', the least-privileged role, rather than
// being blocked outright — being signed in at all already means they were invited into this
// internal tool.
//
// Deliberately fails closed: if Clerk isn't configured or nobody is signed in, callers get
// null and must refuse the request rather than assume a role.
import { currentUser } from '@clerk/nextjs/server';
import type { Role } from '@/types/company';

export type Identity = { userId: string; email: string; name: string; role: Role };

export async function getIdentity(): Promise<Identity | null> {
  let user;
  try {
    user = await currentUser();
  } catch {
    return null;
  }
  if (!user) return null;

  const email = user.primaryEmailAddress?.emailAddress?.toLowerCase() ?? '';
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || email || 'Unknown';
  const readRole = (meta: unknown) => (meta as { role?: unknown } | null | undefined)?.role;
  const rawRole = [readRole(user.privateMetadata), readRole(user.publicMetadata)]
    .find((r) => typeof r === 'string' && r.trim().toLowerCase() === 'manager');
  const role: Role = rawRole ? 'manager' : 'staff';

  return { userId: user.id, email, name, role };
}

export async function requireManager(): Promise<Identity | null> {
  const identity = await getIdentity();
  return identity?.role === 'manager' ? identity : null;
}
