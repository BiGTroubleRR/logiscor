// Duplicates a company under a "HUB N" name (see nextHubName in duplicates.ts). Looks the
// original up server-side rather than trusting a client-supplied copy of its fields.
import { NextResponse } from 'next/server';
import { getIdentity } from '@/lib/role';
import { MissingServiceRoleKeyError } from '@/lib/supabase/admin-server';
import { listCompanies, duplicateCompany } from '@/lib/supabase/companies';
import { nextHubName } from '@/lib/duplicates';

export async function POST(request: Request) {
  const identity = await getIdentity();
  if (!identity) return NextResponse.json({ error: 'Not authorised.' }, { status: 403 });

  const body = (await request.json().catch(() => null)) as { id?: string } | null;
  if (!body?.id) return NextResponse.json({ error: 'Expected "id".' }, { status: 400 });

  try {
    const companies = await listCompanies();
    const original = companies.find((c) => c.id === body.id);
    if (!original) return NextResponse.json({ error: 'Company not found.' }, { status: 404 });

    const newName = nextHubName(
      original.name,
      companies.map((c) => c.name),
    );
    const company = await duplicateCompany(original, newName);
    return NextResponse.json({ company });
  } catch (e) {
    if (e instanceof MissingServiceRoleKeyError) {
      return NextResponse.json({ error: e.message, code: 'missing_service_role_key' }, { status: 503 });
    }
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Unexpected error.' }, { status: 500 });
  }
}
