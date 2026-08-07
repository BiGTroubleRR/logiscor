// SERVER ONLY. Data access for the companies + activity_log tables, always via the
// service-role client (see admin-server.ts). Every function here assumes the caller has
// already checked the Supabase session — see src/lib/role.ts and the Route Handlers under
// src/app/api/companies/.
import { createAdminClient } from './admin-server';
import type { Company, ActivityLogEntry, NewCompanyInput, ActivityType } from '@/types/company';

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
