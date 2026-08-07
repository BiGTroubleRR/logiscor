import { NextResponse } from 'next/server';
import { getIdentity } from '@/lib/role';
import { MissingServiceRoleKeyError } from '@/lib/supabase/admin-server';
import { updateLabelColor } from '@/lib/supabase/companies';
import { ROW_COLORS } from '@/lib/row-colors';

export async function PATCH(request: Request) {
  const identity = await getIdentity();
  if (!identity) return NextResponse.json({ error: 'Not authorised.' }, { status: 403 });

  const body = (await request.json().catch(() => null)) as { id?: string; color?: string } | null;
  if (!body?.id || typeof body.color !== 'string') {
    return NextResponse.json({ error: 'Expected "id" and "color".' }, { status: 400 });
  }
  if (body.color !== '' && !ROW_COLORS.some((c) => c.hex === body.color)) {
    return NextResponse.json({ error: 'Unrecognised color.' }, { status: 400 });
  }

  try {
    const company = await updateLabelColor(body.id, body.color);
    return NextResponse.json({ company });
  } catch (e) {
    if (e instanceof MissingServiceRoleKeyError) {
      return NextResponse.json({ error: e.message, code: 'missing_service_role_key' }, { status: 503 });
    }
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Unexpected error.' }, { status: 500 });
  }
}
