// Bulk company import. Re-validates server-side with the same validateImportRows() the client
// preview uses — never trust that a client-side check ran, or ran honestly. Duplicate detection
// (partitionDuplicateRows) is deliberately NOT re-applied here: it's a data-quality preview step,
// not a security boundary, and the client's import preview already lets staff review flagged
// duplicates and explicitly choose to import specific ones anyway (e.g. separate hubs of the
// same company sharing a domain) — re-excluding them here would silently undo that choice.
import { NextResponse } from 'next/server';
import { getIdentity } from '@/lib/role';
import { MissingServiceRoleKeyError } from '@/lib/supabase/admin-server';
import { insertCompaniesBatch } from '@/lib/supabase/companies';
import { validateImportRows } from '@/lib/company-import';
import type { Locale } from '@/lib/i18n/locale';

const MAX_ROWS = 2000;

export async function POST(request: Request) {
  const identity = await getIdentity();
  if (!identity) return NextResponse.json({ error: 'Not authorised.' }, { status: 403 });

  const body = (await request.json().catch(() => null)) as { rows?: Record<string, unknown>[]; locale?: string } | null;
  if (!body?.rows || !Array.isArray(body.rows)) {
    return NextResponse.json({ error: 'Expected "rows" array.' }, { status: 400 });
  }
  if (body.rows.length === 0) {
    return NextResponse.json({ error: 'No rows to import.' }, { status: 400 });
  }
  if (body.rows.length > MAX_ROWS) {
    return NextResponse.json({ error: `Too many rows — max ${MAX_ROWS} per import.` }, { status: 400 });
  }
  const locale: Locale = body.locale === 'cs' ? 'cs' : 'en';

  const { valid, errors } = validateImportRows(body.rows, locale);
  if (valid.length === 0) {
    return NextResponse.json({ error: 'No valid rows to import.', rowErrors: errors }, { status: 400 });
  }

  try {
    const companies = await insertCompaniesBatch(valid, `Excel import by ${identity.name}`);
    return NextResponse.json({ companies, rowErrors: errors });
  } catch (e) {
    if (e instanceof MissingServiceRoleKeyError) {
      return NextResponse.json({ error: e.message, code: 'missing_service_role_key' }, { status: 503 });
    }
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Unexpected error.' }, { status: 500 });
  }
}
