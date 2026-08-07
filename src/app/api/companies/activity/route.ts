import { NextResponse } from 'next/server';
import { getIdentity } from '@/lib/role';
import { MissingServiceRoleKeyError } from '@/lib/supabase/admin-server';
import { listActivityLog, addActivityLogEntry } from '@/lib/supabase/companies';
import type { ActivityType } from '@/types/company';

const ACTIVITY_TYPES: ActivityType[] = ['Call', 'Email', 'Meeting', 'Note'];

export async function GET(request: Request) {
  const identity = await getIdentity();
  if (!identity) return NextResponse.json({ error: 'Not authorised.' }, { status: 403 });

  const companyId = new URL(request.url).searchParams.get('companyId');
  if (!companyId) return NextResponse.json({ error: 'Expected "companyId" query param.' }, { status: 400 });

  try {
    const entries = await listActivityLog(companyId);
    return NextResponse.json({ entries });
  } catch (e) {
    if (e instanceof MissingServiceRoleKeyError) {
      return NextResponse.json({ error: e.message, code: 'missing_service_role_key' }, { status: 503 });
    }
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Unexpected error.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const identity = await getIdentity();
  if (!identity) return NextResponse.json({ error: 'Not authorised.' }, { status: 403 });

  const body = (await request.json().catch(() => null)) as { companyId?: string; type?: string; summary?: string } | null;
  if (!body?.companyId || !body.type || !body.summary?.trim()) {
    return NextResponse.json({ error: 'Expected "companyId", "type", and non-empty "summary".' }, { status: 400 });
  }
  if (!ACTIVITY_TYPES.includes(body.type as ActivityType)) {
    return NextResponse.json({ error: 'Invalid activity type.' }, { status: 400 });
  }

  try {
    const entry = await addActivityLogEntry(body.companyId, body.type as ActivityType, identity.name, body.summary.trim());
    return NextResponse.json({ entry });
  } catch (e) {
    if (e instanceof MissingServiceRoleKeyError) {
      return NextResponse.json({ error: e.message, code: 'missing_service_role_key' }, { status: 503 });
    }
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Unexpected error.' }, { status: 500 });
  }
}
