export type ProjectStatus = 'active' | 'on_hold' | 'completed' | 'cancelled';

// Mirrors public.projects.
export type Project = {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
};

// Mirrors public.project_companies — one row per company assigned to a project.
export type ProjectCompanyLink = {
  id: string;
  project_id: string;
  company_id: string;
  added_by: string;
  // The rate this company quoted for the project, and any notes on that proposal — captured
  // when the company is added, editable afterward. Null/empty until staff fill them in.
  quoted_rate: number | null;
  remarks: string;
  created_at: string;
};

export type NewProjectInput = Pick<Project, 'name' | 'description' | 'status' | 'start_date' | 'end_date'>;

// Client-side view with the derived company count, for ProjectsView's table.
export type ProjectView = Project & { companyCount: number };
