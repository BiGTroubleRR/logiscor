import { NextResponse } from 'next/server';
import { getIdentity } from '@/lib/role';
import { MissingServiceRoleKeyError } from '@/lib/supabase/admin-server';
import { listRateQuotes, addRateQuote, deleteRateQuote } from '@/lib/supabase/rate-quotes';

export async function GET(request: Request) {
  const identity = await getIdentity();
  if (!identity) return NextResponse.json({ error: 'Not authorised.' }, { status: 403 });

  const companyId = new URL(request.url).searchParams.get('companyId');
  if (!companyId) return NextResponse.json({ error: 'Expected "companyId" query param.' }, { status: 400 });

  try {
    const quotes = await listRateQuotes(companyId);
    return NextResponse.json({ quotes });
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

  const body = (await request.json().catch(() => null)) as
    | {
        companyId?: string;
        origin?: string;
        destination?: string;
        cargoType?: string;
        vehicleType?: string;
        rate?: number | null;
        demFt?: string;
        notes?: string;
      }
    | null;
  if (!body?.companyId || !body.origin?.trim() || !body.destination?.trim()) {
    return NextResponse.json({ error: 'Expected "companyId", non-empty "origin", and non-empty "destination".' }, { status: 400 });
  }

  try {
    const quote = await addRateQuote(body.companyId, {
      origin: body.origin.trim(),
      destination: body.destination.trim(),
      cargo_type: body.cargoType?.trim() ?? '',
      vehicle_type: body.vehicleType?.trim() ?? '',
      rate: typeof body.rate === 'number' && Number.isFinite(body.rate) ? body.rate : null,
      dem_ft: body.demFt?.trim() ?? '',
      notes: body.notes?.trim() ?? '',
    });
    return NextResponse.json({ quote });
  } catch (e) {
    if (e instanceof MissingServiceRoleKeyError) {
      return NextResponse.json({ error: e.message, code: 'missing_service_role_key' }, { status: 503 });
    }
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Unexpected error.' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const identity = await getIdentity();
  if (!identity) return NextResponse.json({ error: 'Not authorised.' }, { status: 403 });

  const body = (await request.json().catch(() => null)) as { id?: string } | null;
  if (!body?.id) return NextResponse.json({ error: 'Expected "id".' }, { status: 400 });

  try {
    await deleteRateQuote(body.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof MissingServiceRoleKeyError) {
      return NextResponse.json({ error: e.message, code: 'missing_service_role_key' }, { status: 503 });
    }
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Unexpected error.' }, { status: 500 });
  }
}
