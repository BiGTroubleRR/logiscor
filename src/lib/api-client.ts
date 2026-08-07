// Thin fetch wrappers the client components call. Every request hits a Route Handler under
// src/app/api/companies/, which re-checks the Supabase session server-side — see src/lib/role.ts.
import type { ActivityLogEntry, ActivityType, Company, NewCompanyInput } from '@/types/company';
import type { Identity } from '@/lib/role';
import type { ImportedCompanyRow, ImportRowError } from '@/lib/company-import';

async function unwrap<T>(res: Response, key: string): Promise<T> {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.error ?? `Request failed (${res.status}).`);
  return body[key] as T;
}

export async function fetchIdentity(): Promise<Identity> {
  const res = await fetch('/api/me', { cache: 'no-store' });
  return unwrap<Identity>(res, 'identity');
}

export async function fetchCompanies(): Promise<Company[]> {
  const res = await fetch('/api/companies', { cache: 'no-store' });
  return unwrap<Company[]>(res, 'companies');
}

export async function createCompany(): Promise<Company> {
  const res = await fetch('/api/companies', { method: 'POST' });
  return unwrap<Company>(res, 'company');
}

export async function updateCompanyDetails(id: string, patch: Partial<NewCompanyInput>): Promise<Company> {
  const res = await fetch('/api/companies', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, patch }),
  });
  return unwrap<Company>(res, 'company');
}

export async function deleteCompanyApi(id: string): Promise<void> {
  const res = await fetch('/api/companies', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  });
  await unwrap<{ ok: true }>(res, 'ok');
}

export async function saveStrengthScore(id: string, score: number, rationale: string): Promise<Company> {
  const res = await fetch('/api/companies/score', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, score, rationale }),
  });
  return unwrap<Company>(res, 'company');
}

export async function saveCapabilityTags(id: string, tags: string[]): Promise<Company> {
  const res = await fetch('/api/companies/tags', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, tags }),
  });
  return unwrap<Company>(res, 'company');
}

export async function saveTrailerTypes(id: string, types: string[]): Promise<Company> {
  const res = await fetch('/api/companies/trailer-types', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, types }),
  });
  return unwrap<Company>(res, 'company');
}

export async function importCompanies(rows: ImportedCompanyRow[]): Promise<{ companies: Company[]; rowErrors: ImportRowError[] }> {
  const res = await fetch('/api/companies/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rows }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.error ?? `Request failed (${res.status}).`);
  return { companies: body.companies ?? [], rowErrors: body.rowErrors ?? [] };
}

export async function duplicateCompanyApi(id: string): Promise<Company> {
  const res = await fetch('/api/companies/copy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  });
  return unwrap<Company>(res, 'company');
}

export async function setDuplicateDismissedApi(id: string, dismissed: boolean): Promise<Company> {
  const res = await fetch('/api/companies/duplicate', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, dismissed }),
  });
  return unwrap<Company>(res, 'company');
}

export async function fetchActivityLog(companyId: string): Promise<ActivityLogEntry[]> {
  const res = await fetch(`/api/companies/activity?companyId=${encodeURIComponent(companyId)}`, { cache: 'no-store' });
  return unwrap<ActivityLogEntry[]>(res, 'entries');
}

export async function addActivityLogEntryApi(companyId: string, type: ActivityType, summary: string): Promise<ActivityLogEntry> {
  const res = await fetch('/api/companies/activity', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ companyId, type, summary }),
  });
  return unwrap<ActivityLogEntry>(res, 'entry');
}
