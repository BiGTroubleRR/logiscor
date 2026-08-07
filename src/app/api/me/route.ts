// Replaces the prototype's plain "Role" dropdown — the signed-in user's role now comes from
// their real Clerk identity (src/lib/role.ts), not a client-side select anyone could flip.
import { NextResponse } from 'next/server';
import { getIdentity } from '@/lib/role';

export async function GET() {
  const identity = await getIdentity();
  if (!identity) return NextResponse.json({ error: 'Not authorised.' }, { status: 403 });
  return NextResponse.json({ identity });
}
