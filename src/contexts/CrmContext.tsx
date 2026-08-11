'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Company, CompanyView, ActivityLogEntry, ActivityType, CompanyType, NewCompanyInput, RateQuote } from '@/types/company';
import type { Identity } from '@/lib/role';
import { haversineKm, spreadOverlappingCoords } from '@/lib/geo';
import { computeDuplicateFlags } from '@/lib/duplicates';
import { matchCompanyAgainstRoute, type RouteMatchResult } from '@/lib/route-match';
import type { LatLng } from '@/lib/geo';
import { PRESET_TRAILER_TYPES } from '@/lib/trailer-types';
import { PRESET_CAPABILITIES } from '@/lib/capabilities';
import type { ImportedCompanyRow, ImportRowError } from '@/lib/company-import';
import * as api from '@/lib/api-client';
import { useLocale } from './LocaleContext';

export type FilterState = {
  type: string;
  country: string;
  region: string;
  capability: string;
  trailerType: string;
  duplicatesOnly: boolean;
  search: string;
};

const DEFAULT_FILTERS: FilterState = {
  type: 'all',
  country: 'all',
  region: 'all',
  capability: 'all',
  trailerType: 'all',
  duplicatesOnly: false,
  search: '',
};

export type SortKey = 'name' | 'type' | 'country' | 'region' | 'strength_score' | 'distance_km' | 'updated_at';
export type SortState = { key: SortKey; dir: 'asc' | 'desc' };

export type RouteState = {
  originText: string;
  destText: string;
  originCoord: LatLng | null;
  destCoord: LatLng | null;
  path: LatLng[] | null;
  hasDirections: boolean;
  corridorKm: number;
  active: boolean;
  loading: boolean;
  error: string;
  // Real driving distance/time from OSRM, alongside the route (used for display only — the
  // corridor search itself scores against `path`, not this).
  routeInfo: { distanceKm: number; durationMin: number } | null;
};

const DEFAULT_ROUTE: RouteState = {
  originText: '',
  destText: '',
  originCoord: null,
  destCoord: null,
  path: null,
  hasDirections: false,
  corridorKm: 50,
  active: false,
  loading: false,
  error: '',
  routeInfo: null,
};

export type EditDraft = {
  name: string;
  type: CompanyType;
  country: string;
  region: string;
  city: string;
  lat: string;
  lng: string;
  website: string;
  phone: string;
  email: string;
  pending_review: boolean;
  description: string;
};

export type DrawerDraft = {
  strength: number;
  rationale: string;
  tagChoice: string;
  trailerTypeChoice: string;
  companyTypeChoice: string;
  activityType: ActivityType;
  activityNote: string;
  rateOrigin: string;
  rateDestination: string;
  rateTransportMode: string;
  rateLoadType: string;
  rateContainerType: string;
  rateVehicleType: string;
  rateCapacity: string;
  rateCargoType: string;
  rateHazmatClass: string;
  rateServiceType: string;
  rateDeliveryScope: string;
  rateAmount: string;
  rateDemFt: string;
  rateNotes: string;
};

const EMPTY_RATE_DRAFT_FIELDS = {
  rateOrigin: '',
  rateDestination: '',
  rateTransportMode: '',
  rateLoadType: '',
  rateContainerType: '',
  rateVehicleType: '',
  rateCapacity: '',
  rateCargoType: '',
  rateHazmatClass: '',
  rateServiceType: '',
  rateDeliveryScope: '',
  rateAmount: '',
  rateDemFt: '',
  rateNotes: '',
};

type CrmContextValue = {
  identity: Identity | null;
  loading: boolean;
  loadError: string;
  view: 'list' | 'map' | 'bin';
  setView: (v: 'list' | 'map' | 'bin') => void;

  binCompanies: Company[];
  binLoading: boolean;
  openBinView: () => void;
  restoreCompanyAction: (id: string) => Promise<void>;
  permanentlyDeleteCompanyAction: (id: string) => Promise<void>;

  companies: CompanyView[];
  filtered: CompanyView[];
  sorted: CompanyView[];
  filters: FilterState;
  setFilters: (patch: Partial<FilterState>) => void;
  clearFilters: () => void;
  sort: SortState;
  toggleSort: (key: SortKey) => void;

  typeOptions: { value: string; label: string }[];
  countryOptions: { value: string; label: string }[];
  regionOptions: { value: string; label: string }[];
  capabilityOptions: { value: string; label: string }[];
  trailerTypeOptions: { value: string; label: string }[];
  allCapabilities: string[];
  allTrailerTypes: string[];
  duplicateCount: number;

  route: RouteState;
  setRouteField: (patch: Partial<RouteState>) => void;
  setCorridorKm: (km: number) => void;
  runRouteSearch: () => Promise<void>;
  clearRoute: () => void;

  selectedId: string | null;
  selected: CompanyView | null;
  openDrawer: (id: string) => void;
  closeDrawer: () => void;
  activityLog: ActivityLogEntry[];
  activityLoading: boolean;
  rateQuotes: RateQuote[];
  rateQuotesLoading: boolean;

  draft: DrawerDraft;
  setDraft: (patch: Partial<DrawerDraft>) => void;
  saveStrength: () => Promise<void>;
  addTag: () => Promise<void>;
  removeTag: (tag: string) => Promise<void>;
  addTrailerType: () => Promise<void>;
  removeTrailerType: (type: string) => Promise<void>;
  addCompanyType: () => Promise<void>;
  removeCompanyType: (type: string) => Promise<void>;
  addActivity: () => Promise<void>;
  addRateQuote: () => Promise<void>;
  deleteRateQuoteAction: (id: string) => Promise<void>;

  editingDetails: boolean;
  editDraft: EditDraft | null;
  editError: string;
  startEditDetails: () => void;
  cancelEditDetails: () => void;
  setEditField: <K extends keyof EditDraft>(key: K, value: EditDraft[K]) => void;
  saveEditDetails: () => Promise<void>;

  addCompany: () => Promise<void>;
  duplicateCompanyAction: (id: string) => Promise<void>;
  importCompanies: (rows: ImportedCompanyRow[]) => Promise<{ importedCount: number; rowErrors: ImportRowError[] } | null>;
  deleteCompanyAction: (id: string) => Promise<void>;
  dismissDuplicate: (id: string) => Promise<void>;
  restoreDuplicate: (id: string) => Promise<void>;
  setLabelColor: (id: string, color: string) => Promise<void>;

  mutationError: string;
};

const CrmContext = createContext<CrmContextValue | null>(null);

export function CrmProvider({ children }: { children: ReactNode }) {
  const { locale, t } = useLocale();
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [rawCompanies, setRawCompanies] = useState<Company[]>([]);
  const [mutationError, setMutationError] = useState('');

  const [view, setView] = useState<'list' | 'map' | 'bin'>('list');
  const [binCompanies, setBinCompanies] = useState<Company[]>([]);
  const [binLoading, setBinLoading] = useState(false);
  const [filters, setFiltersState] = useState<FilterState>(DEFAULT_FILTERS);
  const [sort, setSort] = useState<SortState>({ key: 'name', dir: 'asc' });
  const [route, setRoute] = useState<RouteState>(DEFAULT_ROUTE);
  const [routeMatches, setRouteMatches] = useState<Map<string, RouteMatchResult>>(new Map());

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [rateQuotes, setRateQuotes] = useState<RateQuote[]>([]);
  const [rateQuotesLoading, setRateQuotesLoading] = useState(false);
  const [draft, setDraftState] = useState<DrawerDraft>({
    strength: 0,
    rationale: '',
    tagChoice: '',
    trailerTypeChoice: '',
    companyTypeChoice: '',
    activityType: 'Call',
    activityNote: '',
    ...EMPTY_RATE_DRAFT_FIELDS,
  });

  const [editingDetails, setEditingDetails] = useState(false);
  const [editDraft, setEditDraftState] = useState<EditDraft | null>(null);
  const [editError, setEditError] = useState('');

  // ---- initial load ----
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [ident, comps] = await Promise.all([api.fetchIdentity(), api.fetchCompanies()]);
        if (cancelled) return;
        setIdentity(ident);
        setRawCompanies(comps);
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : t.errors.failedToLoad);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // Runs once on mount only — intentionally not re-fetching on locale toggle. `t` is read at
    // the moment the catch fires, not captured as a stale dependency worth re-running for.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- derived: companies with display coords, duplicate flags, and ephemeral route matches ----
  const companies = useMemo<CompanyView[]>(() => {
    const spread = spreadOverlappingCoords(rawCompanies);
    const withDuplicates = computeDuplicateFlags(spread);
    const originCoord = route.originCoord;
    const destCoord = route.destCoord;
    return withDuplicates.map((c) => {
      const rm = routeMatches.get(c.id);
      return {
        ...c,
        route_distance_km: rm?.route_distance_km ?? null,
        routeMatch: rm?.routeMatch ?? false,
        distance_to_origin_km: originCoord ? Math.round(haversineKm(c.lat, c.lng, originCoord.lat, originCoord.lng) * 10) / 10 : null,
        distance_to_dest_km: destCoord ? Math.round(haversineKm(c.lat, c.lng, destCoord.lat, destCoord.lng) * 10) / 10 : null,
      };
    });
  }, [rawCompanies, routeMatches, route.originCoord, route.destCoord]);

  // Union of the preset list and whatever's actually in use, so staff can pick a capability
  // that's never been used yet instead of only ones already present in the data.
  const allCapabilities = useMemo(
    () => Array.from(new Set([...PRESET_CAPABILITIES, ...companies.flatMap((c) => c.capability_tags)])).sort(),
    [companies],
  );

  // Same reasoning as allCapabilities above — see src/lib/trailer-types.ts.
  const allTrailerTypes = useMemo(
    () => Array.from(new Set([...PRESET_TRAILER_TYPES, ...companies.flatMap((c) => c.trailer_types)])).sort(),
    [companies],
  );

  const typeOptions = useMemo(
    () => Array.from(new Set(companies.flatMap((c) => c.types))).sort().map((t) => ({ value: t, label: t })),
    [companies],
  );
  const countryOptions = useMemo(
    () => Array.from(new Set(companies.map((c) => c.country))).filter(Boolean).sort().map((v) => ({ value: v, label: v })),
    [companies],
  );
  const regionOptions = useMemo(
    () => Array.from(new Set(companies.map((c) => c.region))).filter(Boolean).sort().map((v) => ({ value: v, label: v })),
    [companies],
  );
  const capabilityOptions = useMemo(() => allCapabilities.map((t) => ({ value: t, label: t })), [allCapabilities]);
  const trailerTypeOptions = useMemo(() => allTrailerTypes.map((t) => ({ value: t, label: t })), [allTrailerTypes]);

  const filtered = useMemo(() => {
    const search = filters.search.trim().toLowerCase();
    return companies.filter(
      (c) =>
        (filters.type === 'all' || c.types.includes(filters.type as CompanyType)) &&
        (filters.country === 'all' || c.country === filters.country) &&
        (filters.region === 'all' || c.region === filters.region) &&
        (filters.capability === 'all' || c.capability_tags.includes(filters.capability)) &&
        (filters.trailerType === 'all' || c.trailer_types.includes(filters.trailerType)) &&
        (!filters.duplicatesOnly || c.isDuplicate) &&
        (!route.active || c.routeMatch) &&
        (search === '' ||
          c.name.toLowerCase().includes(search) ||
          c.city.toLowerCase().includes(search) ||
          c.description.toLowerCase().includes(search)),
    );
  }, [companies, filters, route.active]);

  const sorted = useMemo(() => {
    const key = sort.key;
    return [...filtered].sort((a, b) => {
      const av = (a as unknown as Record<string, unknown>)[key];
      const bv = (b as unknown as Record<string, unknown>)[key];
      const cmp = typeof av === 'string' && typeof bv === 'string' ? av.localeCompare(bv) : ((av as number) ?? -1) - ((bv as number) ?? -1);
      return sort.dir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sort]);

  const duplicateCount = useMemo(() => companies.filter((c) => c.isDuplicate).length, [companies]);

  const selected = useMemo(() => (selectedId ? companies.find((c) => c.id === selectedId) ?? null : null), [companies, selectedId]);

  // ---- mutation helper ----
  const runMutation = useCallback(async <T,>(fn: () => Promise<T>): Promise<T | null> => {
    setMutationError('');
    try {
      return await fn();
    } catch (e) {
      setMutationError(e instanceof Error ? e.message : t.errors.somethingWentWrong);
      return null;
    }
  }, [t]);

  function patchCompanyLocal(updated: Company) {
    setRawCompanies((list) => list.map((c) => (c.id === updated.id ? updated : c)));
  }

  // ---- filters/sort ----
  const setFilters = useCallback((patch: Partial<FilterState>) => setFiltersState((f) => ({ ...f, ...patch })), []);
  const clearFilters = useCallback(() => setFiltersState(DEFAULT_FILTERS), []);
  const toggleSort = useCallback(
    (key: SortKey) => setSort((s) => ({ key, dir: s.key === key && s.dir === 'asc' ? 'desc' : 'asc' })),
    [],
  );

  // ---- route search ----
  const setRouteField = useCallback((patch: Partial<RouteState>) => setRoute((r) => ({ ...r, ...patch })), []);

  const recomputeRouteMatches = useCallback(
    (originCoord: LatLng, destCoord: LatLng, path: LatLng[] | null, corridorKm: number) => {
      const usePath = path && path.length >= 2 ? path : [originCoord, destCoord];
      const next = new Map<string, RouteMatchResult>();
      rawCompanies.forEach((c) => {
        next.set(c.id, matchCompanyAgainstRoute(c, usePath, corridorKm));
      });
      setRouteMatches(next);
    },
    [rawCompanies],
  );

  const geocodePlace = useCallback(async (text: string): Promise<LatLng | null> => {
    const r = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(text)}&limit=1`);
    const j = await r.json();
    const f = j.features?.[0];
    if (!f) return null;
    const [lng, lat] = f.geometry.coordinates;
    return { lat, lng };
  }, []);

  // OSRM's public demo server — free, keyless driving directions. Best-effort: on any failure
  // (network, rate limit, no route found) runRouteSearch falls back to a straight-line corridor.
  const fetchDirections = useCallback(async (origin: LatLng, dest: LatLng): Promise<{ path: LatLng[]; distanceKm: number; durationMin: number } | null> => {
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${dest.lng},${dest.lat}?overview=full&geometries=geojson`;
      const res = await fetch(url);
      if (!res.ok) return null;
      const body = await res.json();
      const leg = body.routes?.[0];
      if (!leg) return null;
      const path: LatLng[] = leg.geometry.coordinates.map(([lng, lat]: [number, number]) => ({ lat, lng }));
      return { path, distanceKm: leg.distance / 1000, durationMin: leg.duration / 60 };
    } catch {
      return null;
    }
  }, []);

  const runRouteSearch = useCallback(async () => {
    const { originText, destText, corridorKm } = route;
    if (!originText.trim() || !destText.trim()) return;
    setRoute((r) => ({ ...r, loading: true, error: '' }));
    const [origin, dest] = await Promise.all([geocodePlace(originText), geocodePlace(destText)]);
    if (!origin || !dest) {
      setRoute((r) => ({ ...r, loading: false, error: t.routeSearch.errorNoPlace }));
      return;
    }
    const directions = await fetchDirections(origin, dest);
    const path = directions ? directions.path : [origin, dest];
    setRoute((r) => ({
      ...r,
      originCoord: origin,
      destCoord: dest,
      path,
      hasDirections: !!directions,
      routeInfo: directions ? { distanceKm: directions.distanceKm, durationMin: directions.durationMin } : null,
      active: true,
      loading: false,
      error: directions ? '' : t.routeSearch.errorNoDirections,
    }));
    recomputeRouteMatches(origin, dest, path, corridorKm);
  }, [route, geocodePlace, fetchDirections, recomputeRouteMatches, t]);

  const clearRoute = useCallback(() => {
    setRoute((r) => ({
      ...r,
      active: false,
      originCoord: null,
      destCoord: null,
      path: null,
      hasDirections: false,
      routeInfo: null,
      error: '',
    }));
    setRouteMatches(new Map());
  }, []);

  // The corridor slider recomputes matches while a search is active — triggered from the setter
  // itself rather than an effect, so there's no synchronous setState cascade. Origin/dest changes
  // go through runRouteSearch instead (needs a fresh geocode call).
  //
  // The displayed corridorKm updates immediately (below) so the slider itself never lags, but
  // the actual recompute — O(companies × route-path-points), matching every company against the
  // corridor on every tick — is debounced, same as MapView's marker sync, so dragging the slider
  // doesn't re-run that for every intermediate value.
  const corridorDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const setCorridorKm = useCallback(
    (corridorKm: number) => {
      setRoute((r) => ({ ...r, corridorKm }));
      if (route.active && route.originCoord && route.destCoord) {
        const originCoord = route.originCoord;
        const destCoord = route.destCoord;
        const path = route.path;
        if (corridorDebounceRef.current) clearTimeout(corridorDebounceRef.current);
        corridorDebounceRef.current = setTimeout(() => {
          recomputeRouteMatches(originCoord, destCoord, path, corridorKm);
        }, 150);
      }
    },
    [route.active, route.originCoord, route.destCoord, route.path, recomputeRouteMatches],
  );

  // ---- drawer ----
  const setDraft = useCallback((patch: Partial<DrawerDraft>) => setDraftState((d) => ({ ...d, ...patch })), []);

  // Every caller passes the id of a company already present in `companies` (a clicked table
  // row, a duplicate-match link, etc.), so the synchronous lookup here is safe. The one caller
  // that used to violate that — addCompany(), opening a company it had just created in the
  // same tick, before `companies` had caught up — now builds its own drawer/edit state
  // directly from the API response instead of going through this function.
  const openDrawer = useCallback(
    (id: string) => {
      const c = companies.find((x) => x.id === id);
      if (!c) return;
      setSelectedId(id);
      setEditingDetails(false);
      setEditDraftState(null);
      setEditError('');
      setDraftState({
        strength: c.strength_score ?? 0,
        rationale: c.strength_rationale,
        tagChoice: '',
        trailerTypeChoice: '',
        companyTypeChoice: '',
        activityType: 'Call',
        activityNote: '',
        ...EMPTY_RATE_DRAFT_FIELDS,
      });
      setActivityLoading(true);
      api
        .fetchActivityLog(id)
        .then(setActivityLog)
        .catch(() => setActivityLog([]))
        .finally(() => setActivityLoading(false));
      setRateQuotesLoading(true);
      api
        .fetchRateQuotes(id)
        .then(setRateQuotes)
        .catch(() => setRateQuotes([]))
        .finally(() => setRateQuotesLoading(false));
    },
    [companies],
  );

  const closeDrawer = useCallback(() => {
    setSelectedId(null);
    setEditingDetails(false);
    setEditDraftState(null);
    setActivityLog([]);
    setRateQuotes([]);
  }, []);

  const saveStrength = useCallback(async () => {
    if (!selectedId) return;
    const updated = await runMutation(() => api.saveStrengthScore(selectedId, draft.strength, draft.rationale));
    if (updated) patchCompanyLocal(updated);
  }, [selectedId, draft.strength, draft.rationale, runMutation]);

  const addTag = useCallback(async () => {
    if (!selectedId || !draft.tagChoice || !selected) return;
    const tags = [...selected.capability_tags, draft.tagChoice];
    const updated = await runMutation(() => api.saveCapabilityTags(selectedId, tags));
    if (updated) {
      patchCompanyLocal(updated);
      setDraftState((d) => ({ ...d, tagChoice: '' }));
    }
  }, [selectedId, draft.tagChoice, selected, runMutation]);

  const removeTag = useCallback(
    async (tag: string) => {
      if (!selectedId || !selected) return;
      const tags = selected.capability_tags.filter((t) => t !== tag);
      const updated = await runMutation(() => api.saveCapabilityTags(selectedId, tags));
      if (updated) patchCompanyLocal(updated);
    },
    [selectedId, selected, runMutation],
  );

  const addTrailerType = useCallback(async () => {
    if (!selectedId || !draft.trailerTypeChoice || !selected) return;
    const types = [...selected.trailer_types, draft.trailerTypeChoice];
    const updated = await runMutation(() => api.saveTrailerTypes(selectedId, types));
    if (updated) {
      patchCompanyLocal(updated);
      setDraftState((d) => ({ ...d, trailerTypeChoice: '' }));
    }
  }, [selectedId, draft.trailerTypeChoice, selected, runMutation]);

  const removeTrailerType = useCallback(
    async (type: string) => {
      if (!selectedId || !selected) return;
      const types = selected.trailer_types.filter((t) => t !== type);
      const updated = await runMutation(() => api.saveTrailerTypes(selectedId, types));
      if (updated) patchCompanyLocal(updated);
    },
    [selectedId, selected, runMutation],
  );

  const addCompanyType = useCallback(async () => {
    if (!selectedId || !draft.companyTypeChoice || !selected) return;
    const types = [...selected.types, draft.companyTypeChoice as CompanyType];
    const updated = await runMutation(() => api.saveCompanyTypes(selectedId, types));
    if (updated) {
      patchCompanyLocal(updated);
      setDraftState((d) => ({ ...d, companyTypeChoice: '' }));
    }
  }, [selectedId, draft.companyTypeChoice, selected, runMutation]);

  const removeCompanyType = useCallback(
    async (type: string) => {
      if (!selectedId || !selected || selected.types.length <= 1) return;
      const types = selected.types.filter((t) => t !== type);
      const updated = await runMutation(() => api.saveCompanyTypes(selectedId, types));
      if (updated) patchCompanyLocal(updated);
    },
    [selectedId, selected, runMutation],
  );

  const addActivity = useCallback(async () => {
    if (!selectedId || !draft.activityNote.trim()) return;
    const entry = await runMutation(() => api.addActivityLogEntryApi(selectedId, draft.activityType, draft.activityNote));
    if (entry) {
      setActivityLog((log) => [entry, ...log]);
      setDraftState((d) => ({ ...d, activityNote: '' }));
    }
  }, [selectedId, draft.activityType, draft.activityNote, runMutation]);

  const addRateQuote = useCallback(async () => {
    if (!selectedId || !draft.rateOrigin.trim() || !draft.rateDestination.trim()) return;
    const amount = draft.rateAmount.trim() ? Number(draft.rateAmount) : null;
    const quote = await runMutation(() =>
      api.addRateQuoteApi(selectedId, {
        origin: draft.rateOrigin,
        destination: draft.rateDestination,
        transportMode: draft.rateTransportMode,
        loadType: draft.rateLoadType,
        containerType: draft.rateContainerType,
        vehicleType: draft.rateVehicleType,
        capacity: draft.rateCapacity,
        cargoType: draft.rateCargoType,
        hazmatClass: draft.rateHazmatClass,
        serviceType: draft.rateServiceType,
        deliveryScope: draft.rateDeliveryScope,
        rate: amount != null && Number.isFinite(amount) ? amount : null,
        demFt: draft.rateDemFt,
        notes: draft.rateNotes,
      }),
    );
    if (quote) {
      setRateQuotes((quotes) => [quote, ...quotes]);
      setDraftState((d) => ({ ...d, ...EMPTY_RATE_DRAFT_FIELDS }));
    }
  }, [
    selectedId,
    draft.rateOrigin,
    draft.rateDestination,
    draft.rateTransportMode,
    draft.rateLoadType,
    draft.rateContainerType,
    draft.rateVehicleType,
    draft.rateCapacity,
    draft.rateCargoType,
    draft.rateHazmatClass,
    draft.rateServiceType,
    draft.rateDeliveryScope,
    draft.rateAmount,
    draft.rateDemFt,
    draft.rateNotes,
    runMutation,
  ]);

  const deleteRateQuoteAction = useCallback(
    async (id: string) => {
      const ok = await runMutation(() => api.deleteRateQuoteApi(id));
      if (ok !== null) setRateQuotes((quotes) => quotes.filter((q) => q.id !== id));
    },
    [runMutation],
  );

  // ---- details edit ----
  const startEditDetails = useCallback(() => {
    if (!selected) return;
    setEditingDetails(true);
    setEditError('');
    setEditDraftState({
      name: selected.name,
      type: selected.type,
      country: selected.country,
      region: selected.region,
      city: selected.city,
      lat: String(selected.lat),
      lng: String(selected.lng),
      website: selected.website,
      phone: selected.phone,
      email: selected.email,
      pending_review: selected.pending_review,
      description: selected.description,
    });
  }, [selected]);

  const cancelEditDetails = useCallback(() => {
    setEditingDetails(false);
    setEditDraftState(null);
    setEditError('');
  }, []);

  const setEditField = useCallback(<K extends keyof EditDraft>(key: K, value: EditDraft[K]) => {
    setEditDraftState((d) => (d ? { ...d, [key]: value } : d));
  }, []);

  const saveEditDetails = useCallback(async () => {
    if (!selectedId || !editDraft) return;
    if (!editDraft.name.trim()) {
      setEditError(t.errors.nameRequired);
      return;
    }
    const lat = parseFloat(editDraft.lat);
    const lng = parseFloat(editDraft.lng);
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      setEditError(t.errors.latLngMustBeNumbers);
      return;
    }
    const patch: NewCompanyInput = {
      name: editDraft.name.trim(),
      type: editDraft.type,
      country: editDraft.country,
      region: editDraft.region,
      city: editDraft.city,
      lat,
      lng,
      website: editDraft.website,
      phone: editDraft.phone,
      email: editDraft.email,
      pending_review: editDraft.pending_review,
      description: editDraft.description,
    };
    const updated = await runMutation(() => api.updateCompanyDetails(selectedId, patch));
    if (updated) {
      patchCompanyLocal(updated);
      setEditingDetails(false);
      setEditDraftState(null);
      setEditError('');
    } else {
      setEditError(t.errors.couldNotSaveRetry);
    }
  }, [selectedId, editDraft, runMutation, t]);

  // ---- list-level actions ----
  // Builds the drawer/edit state directly from `created` rather than going through
  // openDrawer()/startEditDetails() — both of those read from `companies`/`selected`, which
  // are still one render behind immediately after setRawCompanies(). Using the freshly-created
  // row's own fields sidesteps that staleness entirely.
  const addCompany = useCallback(async () => {
    const created = await runMutation(() => api.createCompany());
    if (!created) return;
    setRawCompanies((list) => [created, ...list]);
    setSelectedId(created.id);
    setActivityLog([]);
    setActivityLoading(false);
    setRateQuotes([]);
    setRateQuotesLoading(false);
    setEditingDetails(true);
    setEditError('');
    setEditDraftState({
      name: created.name,
      type: created.type,
      country: created.country,
      region: created.region,
      city: created.city,
      lat: String(created.lat),
      lng: String(created.lng),
      website: created.website,
      phone: created.phone,
      email: created.email,
      pending_review: created.pending_review,
      description: created.description,
    });
  }, [runMutation]);

  // Same reasoning as addCompany above: build drawer/edit state directly from `created`
  // rather than routing through openDrawer(), which would still see the pre-duplication list.
  const duplicateCompanyAction = useCallback(
    async (id: string) => {
      const created = await runMutation(() => api.duplicateCompanyApi(id));
      if (!created) return;
      setRawCompanies((list) => [created, ...list]);
      setSelectedId(created.id);
      setActivityLog([]);
      setActivityLoading(false);
      setRateQuotes([]);
      setRateQuotesLoading(false);
      setEditingDetails(false);
      setEditError('');
      setEditDraftState(null);
    },
    [runMutation],
  );

  const importCompanies = useCallback(
    async (rows: ImportedCompanyRow[]): Promise<{ importedCount: number; rowErrors: ImportRowError[] } | null> => {
      const result = await runMutation(() => api.importCompanies(rows, locale));
      if (!result) return null;
      setRawCompanies((list) => [...result.companies, ...list]);
      return { importedCount: result.companies.length, rowErrors: result.rowErrors };
    },
    [runMutation, locale],
  );

  const deleteCompanyAction = useCallback(
    async (id: string) => {
      const c = rawCompanies.find((x) => x.id === id);
      if (c && !window.confirm(t.errors.confirmDeleteCompany(c.name))) return;
      const ok = await runMutation(() => api.deleteCompanyApi(id));
      if (ok !== null) {
        setRawCompanies((list) => list.filter((x) => x.id !== id));
        if (selectedId === id) closeDrawer();
      }
    },
    [rawCompanies, runMutation, selectedId, closeDrawer, t],
  );

  const openBinView = useCallback(() => {
    setView('bin');
    setBinLoading(true);
    api
      .fetchBinCompanies()
      .then(setBinCompanies)
      .catch(() => setBinCompanies([]))
      .finally(() => setBinLoading(false));
  }, []);

  const restoreCompanyAction = useCallback(
    async (id: string) => {
      const restored = await runMutation(() => api.restoreCompanyApi(id));
      if (restored) {
        setBinCompanies((list) => list.filter((c) => c.id !== id));
        setRawCompanies((list) => [restored, ...list]);
      }
    },
    [runMutation],
  );

  const permanentlyDeleteCompanyAction = useCallback(
    async (id: string) => {
      const c = binCompanies.find((x) => x.id === id);
      if (c && !window.confirm(t.errors.confirmPermanentlyDeleteCompany(c.name))) return;
      const ok = await runMutation(() => api.permanentlyDeleteCompanyApi(id));
      if (ok !== null) setBinCompanies((list) => list.filter((x) => x.id !== id));
    },
    [binCompanies, runMutation, t],
  );

  const dismissDuplicate = useCallback(
    async (id: string) => {
      const updated = await runMutation(() => api.setDuplicateDismissedApi(id, true));
      if (updated) patchCompanyLocal(updated);
    },
    [runMutation],
  );

  const setLabelColor = useCallback(
    async (id: string, color: string) => {
      const updated = await runMutation(() => api.setLabelColorApi(id, color));
      if (updated) patchCompanyLocal(updated);
    },
    [runMutation],
  );

  const restoreDuplicate = useCallback(
    async (id: string) => {
      const updated = await runMutation(() => api.setDuplicateDismissedApi(id, false));
      if (updated) patchCompanyLocal(updated);
    },
    [runMutation],
  );

  // Memoized so a re-render that doesn't actually touch any of this state (e.g. a parent
  // provider re-rendering for an unrelated reason) reuses the same value reference instead of
  // forcing every context consumer — including CompanyTable's 500+ rows — to re-render too.
  // Every field below is already either plain state (stable unless actually set) or itself
  // wrapped in useCallback/useMemo, so this dependency list is exhaustive but safe.
  const value: CrmContextValue = useMemo(
    () => ({
    identity,
    loading,
    loadError,
    view,
    setView,
    binCompanies,
    binLoading,
    openBinView,
    restoreCompanyAction,
    permanentlyDeleteCompanyAction,
    companies,
    filtered,
    sorted,
    filters,
    setFilters,
    clearFilters,
    sort,
    toggleSort,
    typeOptions,
    countryOptions,
    regionOptions,
    capabilityOptions,
    trailerTypeOptions,
    allCapabilities,
    allTrailerTypes,
    duplicateCount,
    route,
    setRouteField,
    setCorridorKm,
    runRouteSearch,
    clearRoute,
    selectedId,
    selected,
    openDrawer,
    closeDrawer,
    activityLog,
    activityLoading,
    rateQuotes,
    rateQuotesLoading,
    draft,
    setDraft,
    saveStrength,
    addTag,
    removeTag,
    addTrailerType,
    removeTrailerType,
    addCompanyType,
    removeCompanyType,
    addActivity,
    addRateQuote,
    deleteRateQuoteAction,
    editingDetails,
    editDraft,
    editError,
    startEditDetails,
    cancelEditDetails,
    setEditField,
    saveEditDetails,
    addCompany,
    duplicateCompanyAction,
    importCompanies,
    deleteCompanyAction,
    dismissDuplicate,
    restoreDuplicate,
    setLabelColor,
    mutationError,
    }),
    [
      identity,
      loading,
      loadError,
      view,
      setView,
      binCompanies,
      binLoading,
      openBinView,
      restoreCompanyAction,
      permanentlyDeleteCompanyAction,
      companies,
      filtered,
      sorted,
      filters,
      setFilters,
      clearFilters,
      sort,
      toggleSort,
      typeOptions,
      countryOptions,
      regionOptions,
      capabilityOptions,
      trailerTypeOptions,
      allCapabilities,
      allTrailerTypes,
      duplicateCount,
      route,
      setRouteField,
      setCorridorKm,
      runRouteSearch,
      clearRoute,
      selectedId,
      selected,
      openDrawer,
      closeDrawer,
      activityLog,
      activityLoading,
      rateQuotes,
      rateQuotesLoading,
      draft,
      setDraft,
      saveStrength,
      addTag,
      removeTag,
      addTrailerType,
      removeTrailerType,
      addCompanyType,
      removeCompanyType,
      addActivity,
      addRateQuote,
      deleteRateQuoteAction,
      editingDetails,
      editDraft,
      editError,
      startEditDetails,
      cancelEditDetails,
      setEditField,
      saveEditDetails,
      addCompany,
      duplicateCompanyAction,
      importCompanies,
      deleteCompanyAction,
      dismissDuplicate,
      restoreDuplicate,
      setLabelColor,
      mutationError,
    ],
  );

  return <CrmContext.Provider value={value}>{children}</CrmContext.Provider>;
}

export function useCrm() {
  const ctx = useContext(CrmContext);
  if (!ctx) throw new Error('useCrm must be used within CrmProvider');
  return ctx;
}
