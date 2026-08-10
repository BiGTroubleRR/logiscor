// The Bin: list soft-deleted companies, restore one, or permanently delete one.
import { NextResponse } from 'next/server';
import { getIdentity } from '@/lib/role';
import { MissingServiceRoleKeyError } from '@/lib/supabase/admin-server';
import { listDeletedCompanies, restoreCompany, permanentlyDeleteCompany } from '@/lib/supabase/companies';

function errorResponse(e: unknown) {
  if (e instanceof MissingServiceRoleKeyError) {
    return NextResponse.json({ error: e.message, code: 'missing_service_role_key' }, { status: 503 });
  }
  return NextResponse.json({ error: e instanceof Error ? e.message : 'Unexpected error.' }, { status: 500 });
}

export async function GET() {
  const identity = await getIdentity();
  if (!identity) return NextResponse.json({ error: 'Not authorised.' }, { status: 403 });

  try {
    const companies = await listDeletedCompanies();
    return NextResponse.json({ companies });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function PATCH(request: Request) {
  const identity = await getIdentity();
  if (!identity) return NextResponse.json({ error: 'Not authorised.' }, { status: 403 });

  const body = (await request.json().catch(() => null)) as { id?: string } | null;
  if (!body?.id) return NextResponse.json({ error: 'Expected "id".' }, { status: 400 });

  try {
    const company = await restoreCompany(body.id);
    return NextResponse.json({ company });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function DELETE(request: Request) {
  const identity = await getIdentity();
  if (!identity) return NextResponse.json({ error: 'Not authorised.' }, { status: 403 });

  const body = (await request.json().catch(() => null)) as { id?: string } | null;
  if (!body?.id) return NextResponse.json({ error: 'Expected "id".' }, { status: 400 });

  try {
    await permanentlyDeleteCompany(body.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
