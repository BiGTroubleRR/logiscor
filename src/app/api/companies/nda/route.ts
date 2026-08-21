import { NextResponse } from 'next/server';
import { getIdentity } from '@/lib/role';
import { MissingServiceRoleKeyError } from '@/lib/supabase/admin-server';
import { updateNda } from '@/lib/supabase/companies';

export async function PATCH(request: Request) {
  const identity = await getIdentity();
  if (!identity) return NextResponse.json({ error: 'Not authorised.' }, { status: 403 });

  const body = (await request.json().catch(() => null)) as
    | { id?: string; received?: boolean; receivedDate?: string | null; notes?: string }
    | null;
  if (!body?.id || typeof body.received !== 'boolean') {
    return NextResponse.json({ error: 'Expected "id" and boolean "received".' }, { status: 400 });
  }

  try {
    const company = await updateNda(body.id, body.received, body.receivedDate?.trim() || null, body.notes?.trim() ?? '');
    return NextResponse.json({ company });
  } catch (e) {
    if (e instanceof MissingServiceRoleKeyError) {
      return NextResponse.json({ error: e.message, code: 'missing_service_role_key' }, { status: 503 });
    }
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Unexpected error.' }, { status: 500 });
  }
}
