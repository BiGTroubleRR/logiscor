type CompanyRow = {
  id: string;
  type: string;
  name: string;
  country: string;
  region: string;
  city: string;
  lat: number;
  lng: number;
  industries: string;
  lanes: string;
  capability_tags: string[];
  mulda_presence: string;
  distance_km: number | null;
  distance_anchor: string;
  description: string;
  website: string;
  email: string;
  phone: string;
  source: string;
  source_url: string;
  pending_review: boolean;
  strength_score: number | null;
  strength_rationale: string;
  duplicate_dismissed: boolean;
  created_at: string;
  updated_at: string;
};

type ActivityLogRow = {
  id: string;
  company_id: string;
  entry_date: string;
  type: string;
  author: string;
  summary: string;
  created_at: string;
};

type ProfileRow = {
  id: string;
  email: string;
  role: string;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      companies: {
        Row: CompanyRow;
        Insert: Partial<CompanyRow> & { id: string; name: string; lat: number; lng: number };
        Update: Partial<CompanyRow>;
        Relationships: [];
      };
      activity_log: {
        Row: ActivityLogRow;
        Insert: Partial<ActivityLogRow> & { company_id: string; type: string; author: string; summary: string };
        Update: Partial<ActivityLogRow>;
        Relationships: [];
      };
      profiles: {
        Row: ProfileRow;
        Insert: Partial<ProfileRow> & { id: string };
        Update: Partial<ProfileRow>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
};
