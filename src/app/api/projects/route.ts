// Projects list/create/update/delete. GET bundles projects + every project_companies link in
// one response — CrmContext loads both eagerly on mount, so this avoids a second waterfall
// request for what's effectively one screen's worth of data.
import { NextResponse } from 'next/server';
import { getIdentity } from '@/lib/role';
import { MissingServiceRoleKeyError } from '@/lib/supabase/admin-server';
import { listProjects, listProjectCompanyLinks, insertProject, updateProject, deleteProject } from '@/lib/supabase/projects';
import type { NewProjectInput, ProjectStatus } from '@/types/project';

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
    const [projects, links] = await Promise.all([listProjects(), listProjectCompanyLinks()]);
    return NextResponse.json({ projects, links });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function POST() {
  const identity = await getIdentity();
  if (!identity) return NextResponse.json({ error: 'Not authorised.' }, { status: 403 });

  try {
    const project = await insertProject();
    return NextResponse.json({ project });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function PATCH(request: Request) {
  const identity = await getIdentity();
  if (!identity) return NextResponse.json({ error: 'Not authorised.' }, { status: 403 });

  const body = (await request.json().catch(() => null)) as { id?: string; patch?: Partial<NewProjectInput> } | null;
  if (!body?.id || !body.patch) return NextResponse.json({ error: 'Expected "id" and "patch".' }, { status: 400 });

  try {
    const project = await updateProject(body.id, body.patch as Partial<NewProjectInput> & { status?: ProjectStatus });
    return NextResponse.json({ project });
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
    await deleteProject(body.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
