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
  // Full classification — usually includes `type`, but a company can be more than one thing
  // (e.g. a carrier that also runs warehouse services). `type` stays the primary/legacy value.
  types: CompanyType[];
  name: string;
  country: string;
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
  label_color: string;
  deleted_at: string | null;
  // Set on a company created via the "Add Hub" action — points at the original it's a hub
  // duplicate of. Hidden from the map by default (see showHubsOnMap in CrmContext.tsx).
  hub_of: string | null;
  // ISO 3166-1 alpha-2 codes for routes this carrier serves — structured field for the flags
  // column, falling back to lib/lane-codes.ts's free-text parse where staff haven't filled
  // this in yet (see extractLaneCodes).
  countries_served: string[];
  // Whether an NDA has been signed with this company — nda_received_date/nda_notes are only
  // meaningful once this is true, but stay on the row (not a separate table) since it's a
  // single yes/no fact about the company, not a repeating log like activity_log/rate_quotes.
  nda_received: boolean;
  nda_received_date: string | null;
  nda_notes: string;
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

// A freight rate staff actually received from this company for a given lane — see
// rate_quotes in schema.sql. Append-only from the UI, same as ActivityLogEntry.
export type RateQuote = {
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
  expires_at: string | null;
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
  route_distance_km: number | null;
  routeMatch: boolean;
  // Straight-line distance to the searched route's endpoints — recomputed on every route
  // search, unlike distance_km/distance_anchor which is a fixed value seeded per company.
  distance_to_origin_km: number | null;
  distance_to_dest_km: number | null;
};

export type NewCompanyInput = Pick<
  Company,
  | 'type'
  | 'name'
  | 'country'
  | 'city'
  | 'lat'
  | 'lng'
  | 'website'
  | 'phone'
  | 'email'
  | 'pending_review'
  | 'description'
>;
