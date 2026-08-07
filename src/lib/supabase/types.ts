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
  trailer_types: string[];
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
  label_color: string;
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

type RateQuoteRow = {
  id: string;
  company_id: string;
  origin: string;
  destination: string;
  transport_mode: string;
  load_type: string;
  container_type: string;
  vehicle_type: string;
  capacity: string;
  cargo_type: string;
  hazmat_class: string;
  service_type: string;
  delivery_scope: string;
  rate: number | null;
  dem_ft: string;
  notes: string;
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
      rate_quotes: {
        Row: RateQuoteRow;
        Insert: Partial<RateQuoteRow> & { company_id: string; origin: string; destination: string };
        Update: Partial<RateQuoteRow>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
};
