// SERVER ONLY. Data access for the companies + activity_log tables, always via the
// service-role client (see admin-server.ts). Every function here assumes the caller has
// already checked the Supabase session — see src/lib/role.ts and the Route Handlers under
// src/app/api/companies/.
import { createAdminClient } from './admin-server';
import type { Company, ActivityLogEntry, NewCompanyInput, ActivityType } from '@/types/company';
import type { ImportedCompanyRow } from '@/lib/company-import';

export async function listCompanies(): Promise<Company[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from('companies').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as Company[];
}

export async function insertCompany(input: NewCompanyInput & { id: string }): Promise<Company> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('companies')
    .insert({
      ...input,
      types: [input.type],
      industries: '',
      lanes: '',
      capability_tags: [],
      trailer_types: [],
      distance_km: null,
      distance_anchor: '',
      source: 'Manual entry',
      source_url: '',
      strength_score: null,
      strength_rationale: '',
      duplicate_dismissed: false,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as unknown as Company;
}

// Bulk import path (src/app/api/companies/import/route.ts). A single multi-row insert rather
// than N single-row calls — one round trip, and one partial-failure surface instead of N.
export async function insertCompaniesBatch(rows: ImportedCompanyRow[], source: string): Promise<Company[]> {
  const supabase = createAdminClient();
  const now = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from('companies')
    .insert(
      rows.map((row) => ({
        ...row,
        id: crypto.randomUUID(),
        types: [row.type],
        industries: '',
        lanes: '',
        distance_km: null,
        distance_anchor: '',
        source,
        source_url: '',
        strength_score: null,
        strength_rationale: '',
        duplicate_dismissed: false,
        mulda_presence: 'Does not state' as const,
        created_at: now,
        updated_at: now,
      })),
    )
    .select('*');
  if (error) throw error;
  return (data ?? []) as unknown as Company[];
}

// Copies every substantive field from `original` under a new name (see nextHubName in
// duplicates.ts) — score/rationale and the duplicate-dismissed flag reset, since those are
// judgements about the specific row, not the underlying company data.
export async function duplicateCompany(original: Company, newName: string): Promise<Company> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('companies')
    .insert({
      id: crypto.randomUUID(),
      name: newName,
      type: original.type,
      types: original.types,
      country: original.country,
      region: original.region,
      city: original.city,
      lat: original.lat,
      lng: original.lng,
      industries: original.industries,
      lanes: original.lanes,
      capability_tags: original.capability_tags,
      trailer_types: original.trailer_types,
      mulda_presence: original.mulda_presence,
      distance_km: null,
      distance_anchor: '',
      description: original.description,
      website: original.website,
      email: original.email,
      phone: original.phone,
      source: `Duplicated from "${original.name}"`,
      source_url: original.source_url,
      pending_review: original.pending_review,
      strength_score: null,
      strength_rationale: '',
      duplicate_dismissed: false,
      label_color: original.label_color,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as unknown as Company;
}

export async function updateCompanyDetails(
  id: string,
  patch: Partial<NewCompanyInput>,
): Promise<Company> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from('companies').update(patch).eq('id', id).select('*').single();
  if (error) throw error;
  return data as unknown as Company;
}

export async function updateCapabilityTags(id: string, tags: string[]): Promise<Company> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('companies')
    .update({ capability_tags: tags })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data as unknown as Company;
}

export async function updateTrailerTypes(id: string, types: string[]): Promise<Company> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('companies')
    .update({ trailer_types: types })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data as unknown as Company;
}

export async function updateCompanyTypes(id: string, types: string[]): Promise<Company> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from('companies').update({ types }).eq('id', id).select('*').single();
  if (error) throw error;
  return data as unknown as Company;
}

export async function updateLabelColor(id: string, color: string): Promise<Company> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from('companies').update({ label_color: color }).eq('id', id).select('*').single();
  if (error) throw error;
  return data as unknown as Company;
}

export async function setDuplicateDismissed(id: string, dismissed: boolean): Promise<Company> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('companies')
    .update({ duplicate_dismissed: dismissed })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data as unknown as Company;
}

// Manager-only in practice — enforced by the caller (src/app/api/companies/[id]/score/route.ts)
// checking requireManager() before this ever runs, not by anything in this function itself.
export async function setStrengthScore(id: string, score: number, rationale: string): Promise<Company> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('companies')
    .update({ strength_score: score, strength_rationale: rationale })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data as unknown as Company;
}

export async function deleteCompany(id: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from('companies').delete().eq('id', id);
  if (error) throw error;
}

export async function listActivityLog(companyId: string): Promise<ActivityLogEntry[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('activity_log')
    .select('*')
    .eq('company_id', companyId)
    .order('entry_date', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as ActivityLogEntry[];
}

export async function addActivityLogEntry(
  companyId: string,
  type: ActivityType,
  author: string,
  summary: string,
): Promise<ActivityLogEntry> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('activity_log')
    .insert({ company_id: companyId, type, author, summary })
    .select('*')
    .single();
  if (error) throw error;
  return data as unknown as ActivityLogEntry;
}
