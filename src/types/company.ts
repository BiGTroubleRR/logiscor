export type CompanyType = 'carrier' | 'manufacturer' | 'port' | 'warehouse';
export type MuldaPresence = 'YES' | 'Most likely' | 'No' | 'Does not state';
export type ActivityType = 'Call' | 'Email' | 'Meeting' | 'Note';
export type Role = 'manager' | 'staff';

// Mirrors public.companies. This is the row shape as stored/returned by the API —
// derived, non-persisted fields (duplicate flags, route score, display coords) are
// layered on top client-side, see src/lib/duplicates.ts and src/lib/geo.ts.
export type Company = {
  id: string;
  type: CompanyType;
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
  mulda_presence: MuldaPresence;
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

export type ActivityLogEntry = {
  id: string;
  company_id: string;
  entry_date: string;
  type: ActivityType;
  author: string;
  summary: string;
  created_at: string;
};

// Client-side view of a Company, with computed fields the prototype attached at
// runtime: display coordinates (de-overlapped for the map), duplicate flags, and
// the ephemeral route-search score/match (never persisted).
export type CompanyView = Company & {
  displayLat: number;
  displayLng: number;
  hasDuplicateMatch: boolean;
  isDuplicate: boolean;
  duplicateMatches: { id: string; name: string }[];
  route_score: number | null;
  route_distance_km: number | null;
  routeMatch: boolean;
  route_cargo_match: boolean;
};

export type NewCompanyInput = Pick<
  Company,
  | 'type'
  | 'name'
  | 'country'
  | 'region'
  | 'city'
  | 'lat'
  | 'lng'
  | 'website'
  | 'phone'
  | 'email'
  | 'mulda_presence'
  | 'pending_review'
  | 'description'
>;
