import { NextResponse } from 'next/server';
import { getIdentity } from '@/lib/role';
import { MissingServiceRoleKeyError } from '@/lib/supabase/admin-server';
import { listRateQuotes, listAllRateQuotes, addRateQuote, updateRateQuote, deleteRateQuote } from '@/lib/supabase/rate-quotes';

type RateQuoteBody = {
  companyId?: string;
  origin?: string;
  destination?: string;
  transportMode?: string;
  loadType?: string;
  containerType?: string;
  vehicleType?: string;
  capacity?: string;
  cargoType?: string;
  hazmatClass?: string;
  serviceType?: string;
  deliveryScope?: string;
  rate?: number | null;
  demFt?: string;
  notes?: string;
  expiresAt?: string | null;
};

export async function GET(request: Request) {
  const identity = await getIdentity();
  if (!identity) return NextResponse.json({ error: 'Not authorised.' }, { status: 403 });

  // No "companyId" means "every quote" — used by the route search's quoted-rate column, which
  // has to check quotes across every company, not just one (see fetchAllRateQuotes).
  const companyId = new URL(request.url).searchParams.get('companyId');

  try {
    const quotes = companyId ? await listRateQuotes(companyId) : await listAllRateQuotes();
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

  const body = (await request.json().catch(() => null)) as RateQuoteBody | null;
  if (!body?.companyId || !body.origin?.trim() || !body.destination?.trim()) {
    return NextResponse.json({ error: 'Expected "companyId", non-empty "origin", and non-empty "destination".' }, { status: 400 });
  }

  try {
    const quote = await addRateQuote(body.companyId, {
      origin: body.origin.trim(),
      destination: body.destination.trim(),
      transport_mode: body.transportMode?.trim() ?? '',
      load_type: body.loadType?.trim() ?? '',
      container_type: body.containerType?.trim() ?? '',
      vehicle_type: body.vehicleType?.trim() ?? '',
      capacity: body.capacity?.trim() ?? '',
      cargo_type: body.cargoType?.trim() ?? '',
      hazmat_class: body.hazmatClass?.trim() ?? '',
      service_type: body.serviceType?.trim() ?? '',
      delivery_scope: body.deliveryScope?.trim() ?? '',
      rate: typeof body.rate === 'number' && Number.isFinite(body.rate) ? body.rate : null,
      dem_ft: body.demFt?.trim() ?? '',
      notes: body.notes?.trim() ?? '',
      expires_at: body.expiresAt?.trim() || null,
    });
    return NextResponse.json({ quote });
  } catch (e) {
    if (e instanceof MissingServiceRoleKeyError) {
      return NextResponse.json({ error: e.message, code: 'missing_service_role_key' }, { status: 503 });
    }
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Unexpected error.' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const identity = await getIdentity();
  if (!identity) return NextResponse.json({ error: 'Not authorised.' }, { status: 403 });

  const body = (await request.json().catch(() => null)) as (RateQuoteBody & { id?: string }) | null;
  if (!body?.id || !body.origin?.trim() || !body.destination?.trim()) {
    return NextResponse.json({ error: 'Expected "id", non-empty "origin", and non-empty "destination".' }, { status: 400 });
  }

  try {
    const quote = await updateRateQuote(body.id, {
      origin: body.origin.trim(),
      destination: body.destination.trim(),
      transport_mode: body.transportMode?.trim() ?? '',
      load_type: body.loadType?.trim() ?? '',
      container_type: body.containerType?.trim() ?? '',
      vehicle_type: body.vehicleType?.trim() ?? '',
      capacity: body.capacity?.trim() ?? '',
      cargo_type: body.cargoType?.trim() ?? '',
      hazmat_class: body.hazmatClass?.trim() ?? '',
      service_type: body.serviceType?.trim() ?? '',
      delivery_scope: body.deliveryScope?.trim() ?? '',
      rate: typeof body.rate === 'number' && Number.isFinite(body.rate) ? body.rate : null,
      dem_ft: body.demFt?.trim() ?? '',
      notes: body.notes?.trim() ?? '',
      expires_at: body.expiresAt?.trim() || null,
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
