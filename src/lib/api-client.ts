// Thin fetch wrappers the client components call. Every request hits a Route Handler under
// src/app/api/companies/, which re-checks the Supabase session server-side — see src/lib/role.ts.
import type { ActivityLogEntry, ActivityType, Company, NewCompanyInput, RateQuote } from '@/types/company';
import type { Identity } from '@/lib/role';
import type { ImportedCompanyRow, ImportRowError } from '@/lib/company-import';
import type { NewProjectInput, Project, ProjectCompanyLink } from '@/types/project';

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

export async function fetchBinCompanies(): Promise<Company[]> {
  const res = await fetch('/api/companies/bin', { cache: 'no-store' });
  return unwrap<Company[]>(res, 'companies');
}

export async function restoreCompanyApi(id: string): Promise<Company> {
  const res = await fetch('/api/companies/bin', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  });
  return unwrap<Company>(res, 'company');
}

export async function permanentlyDeleteCompanyApi(id: string): Promise<void> {
  const res = await fetch('/api/companies/bin', {
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

export async function saveCountriesServedApi(id: string, codes: string[]): Promise<Company> {
  const res = await fetch('/api/companies/countries-served', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, codes }),
  });
  return unwrap<Company>(res, 'company');
}

export async function saveCompanyTypes(id: string, types: string[]): Promise<Company> {
  const res = await fetch('/api/companies/types', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, types }),
  });
  return unwrap<Company>(res, 'company');
}

export async function setLabelColorApi(id: string, color: string): Promise<Company> {
  const res = await fetch('/api/companies/color', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, color }),
  });
  return unwrap<Company>(res, 'company');
}

export async function importCompanies(rows: ImportedCompanyRow[], locale: string): Promise<{ companies: Company[]; rowErrors: ImportRowError[] }> {
  const res = await fetch('/api/companies/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rows, locale }),
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

export async function fetchRateQuotes(companyId: string): Promise<RateQuote[]> {
  const res = await fetch(`/api/companies/rates?companyId=${encodeURIComponent(companyId)}`, { cache: 'no-store' });
  return unwrap<RateQuote[]>(res, 'quotes');
}

export type NewRateQuoteInput = {
  origin: string;
  destination: string;
  transportMode: string;
  loadType: string;
  containerType: string;
  vehicleType: string;
  capacity: string;
  cargoType: string;
  hazmatClass: string;
  serviceType: string;
  deliveryScope: string;
  rate: number | null;
  demFt: string;
  notes: string;
  expiresAt: string | null;
};

export async function addRateQuoteApi(companyId: string, input: NewRateQuoteInput): Promise<RateQuote> {
  const res = await fetch('/api/companies/rates', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ companyId, ...input }),
  });
  return unwrap<RateQuote>(res, 'quote');
}

export async function updateRateQuoteApi(id: string, input: NewRateQuoteInput): Promise<RateQuote> {
  const res = await fetch('/api/companies/rates', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, ...input }),
  });
  return unwrap<RateQuote>(res, 'quote');
}

export async function deleteRateQuoteApi(id: string): Promise<void> {
  const res = await fetch('/api/companies/rates', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  });
  await unwrap<{ ok: true }>(res, 'ok');
}

export async function fetchProjects(): Promise<{ projects: Project[]; links: ProjectCompanyLink[] }> {
  const res = await fetch('/api/projects', { cache: 'no-store' });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.error ?? `Request failed (${res.status}).`);
  return { projects: body.projects ?? [], links: body.links ?? [] };
}

export async function createProject(): Promise<Project> {
  const res = await fetch('/api/projects', { method: 'POST' });
  return unwrap<Project>(res, 'project');
}

export async function updateProjectApi(id: string, patch: Partial<NewProjectInput>): Promise<Project> {
  const res = await fetch('/api/projects', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, patch }),
  });
  return unwrap<Project>(res, 'project');
}

export async function deleteProjectApi(id: string): Promise<void> {
  const res = await fetch('/api/projects', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  });
  await unwrap<{ ok: true }>(res, 'ok');
}

export async function addCompanyToProjectApi(projectId: string, companyId: string): Promise<ProjectCompanyLink> {
  const res = await fetch(`/api/projects/${projectId}/companies`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ companyId }),
  });
  return unwrap<ProjectCompanyLink>(res, 'link');
}

export async function removeCompanyFromProjectApi(projectId: string, companyId: string): Promise<void> {
  const res = await fetch(`/api/projects/${projectId}/companies`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ companyId }),
  });
  await unwrap<{ ok: true }>(res, 'ok');
}
