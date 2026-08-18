// Add/remove a company from a project — one route serves both the drawer's "add this
// company to a project" chip UI and the Projects page's "add a company to this project"
// picker, since it's the same operation with a different fixed side.
import { NextResponse } from 'next/server';
import { getIdentity } from '@/lib/role';
import { MissingServiceRoleKeyError } from '@/lib/supabase/admin-server';
import { addCompanyToProject, removeCompanyFromProject, updateProjectCompanyLink } from '@/lib/supabase/projects';

function errorResponse(e: unknown) {
  if (e instanceof MissingServiceRoleKeyError) {
    return NextResponse.json({ error: e.message, code: 'missing_service_role_key' }, { status: 503 });
  }
  return NextResponse.json({ error: e instanceof Error ? e.message : 'Unexpected error.' }, { status: 500 });
}

// A blank/whitespace-only rate input means "not quoted yet", not zero.
function parseQuotedRate(raw: unknown): number | null {
  if (raw == null || raw === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const identity = await getIdentity();
  if (!identity) return NextResponse.json({ error: 'Not authorised.' }, { status: 403 });

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as { companyId?: string; quotedRate?: unknown; remarks?: string } | null;
  if (!body?.companyId) return NextResponse.json({ error: 'Expected "companyId".' }, { status: 400 });

  try {
    const link = await addCompanyToProject(id, body.companyId, identity.name, parseQuotedRate(body.quotedRate), body.remarks?.trim() ?? '');
    return NextResponse.json({ link });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const identity = await getIdentity();
  if (!identity) return NextResponse.json({ error: 'Not authorised.' }, { status: 403 });

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as { companyId?: string; quotedRate?: unknown; remarks?: string } | null;
  if (!body?.companyId) return NextResponse.json({ error: 'Expected "companyId".' }, { status: 400 });

  try {
    const link = await updateProjectCompanyLink(id, body.companyId, { quoted_rate: parseQuotedRate(body.quotedRate), remarks: body.remarks?.trim() ?? '' });
    return NextResponse.json({ link });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const identity = await getIdentity();
  if (!identity) return NextResponse.json({ error: 'Not authorised.' }, { status: 403 });

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as { companyId?: string } | null;
  if (!body?.companyId) return NextResponse.json({ error: 'Expected "companyId".' }, { status: 400 });

  try {
    await removeCompanyFromProject(id, body.companyId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
