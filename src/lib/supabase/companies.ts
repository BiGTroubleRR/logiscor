// SERVER ONLY. Data access for the companies + activity_log tables, always via the
// service-role client (see admin-server.ts). Every function here assumes the caller has
// already checked the Supabase session — see src/lib/role.ts and the Route Handlers under
// src/app/api/companies/.
import { createAdminClient } from './admin-server';
import type { Company, ActivityLogEntry, NewCompanyInput, ActivityType } from '@/types/company';
import type { ImportedCompanyRow } from '@/lib/company-import';
import { hubNoteText, appendHubNote, buildMergedCompanyPatch } from '@/lib/duplicates';

export async function listCompanies(): Promise<Company[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as Company[];
}

// The Bin — companies soft-deleted via deleteCompany() below, restorable via restoreCompany().
export async function listDeletedCompanies(): Promise<Company[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false });
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

// Copies every substantive field from `original` as a "hub" of it — same name, `hub_of`
// pointing at the original, and a note recording the relationship appended to the
// description (see hubNoteText/appendHubNote in duplicates.ts). Score/rationale and the
// duplicate-dismissed flag reset, since those are judgements about the specific row, not
// the underlying company data. `hubNumber` is computed by the caller from sibling count.
export async function duplicateCompany(original: Company, hubNumber: number): Promise<Company> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('companies')
    .insert({
      id: crypto.randomUUID(),
      name: original.name,
      type: original.type,
      types: original.types,
      country: original.country,
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
      description: appendHubNote(original.description, hubNoteText(original.name, hubNumber)),
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
      hub_of: original.id,
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

export async function updateCountriesServed(id: string, codes: string[]): Promise<Company> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('companies')
    .update({ countries_served: codes })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data as unknown as Company;
}

export async function updateNda(id: string, received: boolean, receivedDate: string | null, notes: string): Promise<Company> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('companies')
    .update({ nda_received: received, nda_received_date: receivedDate, nda_notes: notes })
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

// Soft delete — moves the row into the Bin rather than removing it, so it (and its
// activity_log/rate_quotes, never touched by this) can come back via restoreCompany().
export async function deleteCompany(id: string): Promise<Company> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('companies')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data as unknown as Company;
}

export async function restoreCompany(id: string): Promise<Company> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('companies')
    .update({ deleted_at: null })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data as unknown as Company;
}

// The one truly irreversible delete — only reachable from within the Bin, on a company
// that's already soft-deleted.
export async function permanentlyDeleteCompany(id: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from('companies').delete().eq('id', id);
  if (error) throw error;
}

// Folds `loserId` into `survivorId`: fills the survivor's blank fields and unions its tag/
// type/country lists from the loser (see buildMergedCompanyPatch), reassigns the loser's
// activity log, rate quotes, and project links onto the survivor, then soft-deletes the
// loser via the same path as a regular delete (reversible from the Bin, unlike a hard merge).
export async function mergeCompanies(survivorId: string, loserId: string): Promise<Company> {
  const supabase = createAdminClient();

  const { data: rows, error: fetchError } = await supabase.from('companies').select('*').in('id', [survivorId, loserId]);
  if (fetchError) throw fetchError;
  const survivor = (rows ?? []).find((r) => r.id === survivorId) as unknown as Company | undefined;
  const loser = (rows ?? []).find((r) => r.id === loserId) as unknown as Company | undefined;
  if (!survivor || !loser) throw new Error('Both companies must exist to merge.');

  const patch = buildMergedCompanyPatch(survivor, loser);
  const { data: merged, error: updateError } = await supabase.from('companies').update(patch).eq('id', survivorId).select('*').single();
  if (updateError) throw updateError;

  const { error: activityError } = await supabase.from('activity_log').update({ company_id: survivorId }).eq('company_id', loserId);
  if (activityError) throw activityError;

  const { error: ratesError } = await supabase.from('rate_quotes').update({ company_id: survivorId }).eq('company_id', loserId);
  if (ratesError) throw ratesError;

  // project_companies has a unique (project_id, company_id) constraint — if the survivor is
  // already on a project the loser was also on, reassigning would collide. Drop the loser's
  // link for those and keep the survivor's existing one (it may already carry its own quote).
  const { data: survivorLinks, error: survivorLinksError } = await supabase.from('project_companies').select('project_id').eq('company_id', survivorId);
  if (survivorLinksError) throw survivorLinksError;
  const survivorProjectIds = new Set((survivorLinks ?? []).map((l) => l.project_id as string));

  const { data: loserLinks, error: loserLinksError } = await supabase.from('project_companies').select('project_id').eq('company_id', loserId);
  if (loserLinksError) throw loserLinksError;
  const conflictingProjectIds = (loserLinks ?? []).map((l) => l.project_id as string).filter((pid) => survivorProjectIds.has(pid));

  if (conflictingProjectIds.length) {
    const { error: dropError } = await supabase.from('project_companies').delete().eq('company_id', loserId).in('project_id', conflictingProjectIds);
    if (dropError) throw dropError;
  }
  const { error: reassignError } = await supabase.from('project_companies').update({ company_id: survivorId }).eq('company_id', loserId);
  if (reassignError) throw reassignError;

  await deleteCompany(loserId);

  return merged as unknown as Company;
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
