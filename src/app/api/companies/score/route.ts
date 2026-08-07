// Strength-score edits are Procurement-Manager-only. This is the ONE place that rule is
// actually enforced — the drawer's disabled slider is just UX, not security. See
// src/lib/role.ts for how "manager" is decided from the profiles table.
import { NextResponse } from 'next/server';
import { requireManager } from '@/lib/role';
import { MissingServiceRoleKeyError } from '@/lib/supabase/admin-server';
import { setStrengthScore } from '@/lib/supabase/companies';

export async function PATCH(request: Request) {
  const manager = await requireManager();
  if (!manager) return NextResponse.json({ error: 'Only Procurement Managers can edit the strength score.' }, { status: 403 });

  const body = (await request.json().catch(() => null)) as { id?: string; score?: number; rationale?: string } | null;
  if (!body?.id || typeof body.score !== 'number') {
    return NextResponse.json({ error: 'Expected "id" and numeric "score".' }, { status: 400 });
  }
  if (body.score < 0 || body.score > 100) {
    return NextResponse.json({ error: 'Score must be between 0 and 100.' }, { status: 400 });
  }

  try {
    const company = await setStrengthScore(body.id, body.score, body.rationale ?? '');
    return NextResponse.json({ company });
  } catch (e) {
    if (e instanceof MissingServiceRoleKeyError) {
      return NextResponse.json({ error: e.message, code: 'missing_service_role_key' }, { status: 503 });
    }
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Unexpected error.' }, { status: 500 });
  }
}
