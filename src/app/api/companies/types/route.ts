import { NextResponse } from 'next/server';
import { getIdentity } from '@/lib/role';
import { MissingServiceRoleKeyError } from '@/lib/supabase/admin-server';
import { updateCompanyTypes } from '@/lib/supabase/companies';

const VALID_TYPES = ['carrier', 'manufacturer', 'port', 'warehouse'];

export async function PATCH(request: Request) {
  const identity = await getIdentity();
  if (!identity) return NextResponse.json({ error: 'Not authorised.' }, { status: 403 });

  const body = (await request.json().catch(() => null)) as { id?: string; types?: string[] } | null;
  if (!body?.id || !Array.isArray(body.types)) {
    return NextResponse.json({ error: 'Expected "id" and "types" array.' }, { status: 400 });
  }
  if (body.types.some((t) => !VALID_TYPES.includes(t))) {
    return NextResponse.json({ error: `"types" must only contain: ${VALID_TYPES.join(', ')}.` }, { status: 400 });
  }
  if (body.types.length === 0) {
    return NextResponse.json({ error: 'A company must have at least one type.' }, { status: 400 });
  }

  try {
    const company = await updateCompanyTypes(body.id, body.types);
    return NextResponse.json({ company });
  } catch (e) {
    if (e instanceof MissingServiceRoleKeyError) {
      return NextResponse.json({ error: e.message, code: 'missing_service_role_key' }, { status: 503 });
    }
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Unexpected error.' }, { status: 500 });
  }
}
