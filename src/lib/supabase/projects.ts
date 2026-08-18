// SERVER ONLY. Data access for the projects + project_companies tables — same
// service-role-client convention as companies.ts/rate-quotes.ts.
import { createAdminClient } from './admin-server';
import type { NewProjectInput, Project, ProjectCompanyLink } from '@/types/project';

export async function listProjects(): Promise<Project[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from('projects').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as Project[];
}

// The whole join table, unfiltered — CrmContext loads this alongside projects/companies on
// mount (see the eager-load note in CrmContext.tsx) and derives per-project/per-company
// lookups client-side, same as computeDuplicateFlags does for companies.
export async function listProjectCompanyLinks(): Promise<ProjectCompanyLink[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from('project_companies').select('*');
  if (error) throw error;
  return (data ?? []) as unknown as ProjectCompanyLink[];
}

// Fixed defaults — same "create blank, edit inline" UX as addCompany() in companies.ts.
export async function insertProject(): Promise<Project> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('projects')
    .insert({ name: 'New Project', description: '', status: 'active', start_date: null, end_date: null })
    .select('*')
    .single();
  if (error) throw error;
  return data as unknown as Project;
}

export async function updateProject(id: string, patch: Partial<NewProjectInput>): Promise<Project> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from('projects').update(patch).eq('id', id).select('*').single();
  if (error) throw error;
  return data as unknown as Project;
}

// Hard delete — FK cascade on project_companies cleans up its links.
export async function deleteProject(id: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from('projects').delete().eq('id', id);
  if (error) throw error;
}

// A unique-violation (company already linked to this project) is treated as idempotent —
// re-select the existing link rather than throwing, since both the drawer's "add to project"
// chip UI and the Projects page's picker can plausibly race on the same pair.
export async function addCompanyToProject(
  projectId: string,
  companyId: string,
  addedBy: string,
  quotedRate: number | null,
  remarks: string,
): Promise<ProjectCompanyLink> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('project_companies')
    .insert({ project_id: projectId, company_id: companyId, added_by: addedBy, quoted_rate: quotedRate, remarks })
    .select('*')
    .single();
  if (error) {
    if (error.code === '23505') {
      const { data: existing, error: selectError } = await supabase
        .from('project_companies')
        .select('*')
        .eq('project_id', projectId)
        .eq('company_id', companyId)
        .single();
      if (selectError) throw selectError;
      return existing as unknown as ProjectCompanyLink;
    }
    throw error;
  }
  return data as unknown as ProjectCompanyLink;
}

// Lets staff correct/fill in the quote after the company's already been added — the price
// often isn't known yet at add time, or the initial figure was a placeholder.
export async function updateProjectCompanyLink(
  projectId: string,
  companyId: string,
  patch: { quoted_rate: number | null; remarks: string },
): Promise<ProjectCompanyLink> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('project_companies')
    .update(patch)
    .eq('project_id', projectId)
    .eq('company_id', companyId)
    .select('*')
    .single();
  if (error) throw error;
  return data as unknown as ProjectCompanyLink;
}

export async function removeCompanyFromProject(projectId: string, companyId: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from('project_companies').delete().eq('project_id', projectId).eq('company_id', companyId);
  if (error) throw error;
}
