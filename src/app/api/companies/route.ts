// List, create, edit-details, and delete companies. Every handler checks the Supabase session
// itself (proxy.ts already gates the whole app, but Server Functions should never rely on
// that alone) and then reads/writes with the service-role key — see admin-server.ts.
import { NextResponse } from 'next/server';
import { getIdentity } from '@/lib/role';
import { MissingServiceRoleKeyError } from '@/lib/supabase/admin-server';
import { listCompanies, insertCompany, updateCompanyDetails, deleteCompany } from '@/lib/supabase/companies';
import type { CompanyType } from '@/types/company';

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
    const companies = await listCompanies();
    return NextResponse.json({ companies });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function POST() {
  const identity = await getIdentity();
  if (!identity) return NextResponse.json({ error: 'Not authorised.' }, { status: 403 });

  try {
    const company = await insertCompany({
      id: crypto.randomUUID(),
      type: 'carrier',
      name: 'New Company',
      country: '',
      region: '',
      city: '',
      lat: 49.8,
      lng: 16.5,
      website: '',
      phone: '',
      email: '',
      pending_review: true,
      description: '',
    });
    return NextResponse.json({ company });
  } catch (e) {
    return errorResponse(e);
  }
}

type DetailsPatch = {
  name: string;
  type: CompanyType;
  country: string;
  region: string;
  city: string;
  lat: number;
  lng: number;
  website: string;
  phone: string;
  email: string;
  pending_review: boolean;
  description: string;
};

export async function PATCH(request: Request) {
  const identity = await getIdentity();
  if (!identity) return NextResponse.json({ error: 'Not authorised.' }, { status: 403 });

  const body = (await request.json().catch(() => null)) as { id?: string; patch?: Partial<DetailsPatch> } | null;
  if (!body?.id || !body.patch) return NextResponse.json({ error: 'Expected "id" and "patch".' }, { status: 400 });

  if (!body.patch.name?.trim()) return NextResponse.json({ error: 'Name is required.' }, { status: 400 });
  if (body.patch.lat != null && Number.isNaN(body.patch.lat)) {
    return NextResponse.json({ error: 'Latitude and longitude must be numbers.' }, { status: 400 });
  }
  if (body.patch.lng != null && Number.isNaN(body.patch.lng)) {
    return NextResponse.json({ error: 'Latitude and longitude must be numbers.' }, { status: 400 });
  }

  try {
    const company = await updateCompanyDetails(body.id, body.patch);
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
    await deleteCompany(body.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
