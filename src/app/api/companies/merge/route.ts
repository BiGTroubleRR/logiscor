import { NextResponse } from 'next/server';
import { getIdentity } from '@/lib/role';
import { MissingServiceRoleKeyError } from '@/lib/supabase/admin-server';
import { mergeCompanies } from '@/lib/supabase/companies';

export async function POST(request: Request) {
  const identity = await getIdentity();
  if (!identity) return NextResponse.json({ error: 'Not authorised.' }, { status: 403 });

  const body = (await request.json().catch(() => null)) as { survivorId?: string; loserId?: string } | null;
  if (!body?.survivorId || !body?.loserId) {
    return NextResponse.json({ error: 'Expected "survivorId" and "loserId".' }, { status: 400 });
  }
  if (body.survivorId === body.loserId) {
    return NextResponse.json({ error: 'Cannot merge a company with itself.' }, { status: 400 });
  }

  try {
    const company = await mergeCompanies(body.survivorId, body.loserId);
    return NextResponse.json({ company });
  } catch (e) {
    if (e instanceof MissingServiceRoleKeyError) {
      return NextResponse.json({ error: e.message, code: 'missing_service_role_key' }, { status: 503 });
    }
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Unexpected error.' }, { status: 500 });
  }
}
