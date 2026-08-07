'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Company, CompanyView, ActivityLogEntry, ActivityType, MuldaPresence, CompanyType, NewCompanyInput } from '@/types/company';
import type { Identity } from '@/lib/role';
import { spreadOverlappingCoords } from '@/lib/geo';
import { computeDuplicateFlags } from '@/lib/duplicates';
import { getDisplayScore } from '@/lib/format';
import { scoreCompanyAgainstRoute, type RouteScoreResult } from '@/lib/route-score';
import type { LatLng } from '@/lib/geo';
import * as api from '@/lib/api-client';

export type FilterState = {
  type: string;
  country: string;
  region: string;
  capability: string;
  mulda: string;
  pendingOnly: boolean;
  duplicatesOnly: boolean;
  minStrength: number;
  search: string;
};

const DEFAULT_FILTERS: FilterState = {
  type: 'all',
  country: 'all',
  region: 'all',
  capability: 'all',
  mulda: 'all',
  pendingOnly: false,
  duplicatesOnly: false,
  minStrength: 0,
  search: '',
};

export type SortKey = 'name' | 'type' | 'country' | 'region' | 'strength_score' | 'route_score' | 'distance_km';
export type SortState = { key: SortKey; dir: 'asc' | 'desc' };

export type RouteState = {
  originText: string;
  destText: string;
  originCoord: LatLng | null;
  destCoord: LatLng | null;
  path: LatLng[] | null;
  hasDirections: boolean;
  corridorKm: number;
  cargoType: string;
  active: boolean;
  loading: boolean;
  error: string;
  directionsResult: google.maps.DirectionsResult | null;
};

const DEFAULT_ROUTE: RouteState = {
  originText: '',
  destText: '',
  originCoord: null,
  destCoord: null,
  path: null,
  hasDirections: false,
  corridorKm: 50,
  cargoType: '',
  active: false,
  loading: false,
  error: '',
  directionsResult: null,
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
  mulda_presence: MuldaPresence;
  pending_review: boolean;
  description: string;
};

export type DrawerDraft = {
  strength: number;
  rationale: string;
  tagChoice: string;
  activityType: ActivityType;
  activityNote: string;
};

type CrmContextValue = {
  identity: Identity | null;
  loading: boolean;
  loadError: string;
  view: 'list' | 'map';
  setView: (v: 'list' | 'map') => void;

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
  allCapabilities: string[];
  duplicateCount: number;

  route: RouteState;
  setRouteField: (patch: Partial<RouteState>) => void;
  setCorridorKm: (km: number) => void;
  setCargoType: (cargoType: string) => void;
  runRouteSearch: () => Promise<void>;
  clearRoute: () => void;

  selectedId: string | null;
  selected: CompanyView | null;
  openDrawer: (id: string) => void;
  closeDrawer: () => void;
  activityLog: ActivityLogEntry[];
  activityLoading: boolean;

  draft: DrawerDraft;
  setDraft: (patch: Partial<DrawerDraft>) => void;
  saveStrength: () => Promise<void>;
  addTag: () => Promise<void>;
  removeTag: (tag: string) => Promise<void>;
  addActivity: () => Promise<void>;

  editingDetails: boolean;
  editDraft: EditDraft | null;
  editError: string;
  startEditDetails: () => void;
  cancelEditDetails: () => void;
  setEditField: <K extends keyof EditDraft>(key: K, value: EditDraft[K]) => void;
  saveEditDetails: () => Promise<void>;

  addCompany: () => Promise<void>;
  deleteCompanyAction: (id: string) => Promise<void>;
  approveCompany: (id: string) => Promise<void>;
  dismissDuplicate: (id: string) => Promise<void>;
  restoreDuplicate: (id: string) => Promise<void>;

  mutationError: string;
};

const CrmContext = createContext<CrmContextValue | null>(null);

export function CrmProvider({ children }: { children: ReactNode }) {
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [rawCompanies, setRawCompanies] = useState<Company[]>([]);
  const [mutationError, setMutationError] = useState('');

  const [view, setView] = useState<'list' | 'map'>('list');
  const [filters, setFiltersState] = useState<FilterState>(DEFAULT_FILTERS);
  const [sort, setSort] = useState<SortState>({ key: 'name', dir: 'asc' });
  const [route, setRoute] = useState<RouteState>(DEFAULT_ROUTE);
  const [routeScores, setRouteScores] = useState<Map<string, RouteScoreResult>>(new Map());

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [draft, setDraftState] = useState<DrawerDraft>({ strength: 0, rationale: '', tagChoice: '', activityType: 'Call', activityNote: '' });

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
        if (!cancelled) setLoadError(e instanceof Error ? e.message : 'Failed to load.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ---- derived: companies with display coords, duplicate flags, and ephemeral route scores ----
  const companies = useMemo<CompanyView[]>(() => {
    const spread = spreadOverlappingCoords(rawCompanies);
    const withDuplicates = computeDuplicateFlags(spread);
    return withDuplicates.map((c) => {
      const rs = routeScores.get(c.id);
      return {
        ...c,
        route_score: rs?.route_score ?? null,
        route_distance_km: rs?.route_distance_km ?? null,
        routeMatch: rs?.routeMatch ?? false,
        route_cargo_match: rs?.route_cargo_match ?? false,
      };
    });
  }, [rawCompanies, routeScores]);

  const allCapabilities = useMemo(
    () => Array.from(new Set(companies.flatMap((c) => c.capability_tags))).sort(),
    [companies],
  );

  const typeOptions = useMemo(
    () => Array.from(new Set(companies.map((c) => c.type))).sort().map((t) => ({ value: t, label: t })),
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

  const filtered = useMemo(() => {
    const search = filters.search.trim().toLowerCase();
    return companies.filter(
      (c) =>
        (filters.type === 'all' || c.type === filters.type) &&
        (filters.country === 'all' || c.country === filters.country) &&
        (filters.region === 'all' || c.region === filters.region) &&
        (filters.capability === 'all' || c.capability_tags.includes(filters.capability)) &&
        (filters.mulda === 'all' || c.mulda_presence === filters.mulda) &&
        (!filters.pendingOnly || c.pending_review) &&
        (!filters.duplicatesOnly || c.isDuplicate) &&
        (!route.active || c.routeMatch) &&
        (!route.active || (getDisplayScore(c) ?? 0) >= filters.minStrength) &&
        (search === '' || c.name.toLowerCase().includes(search) || c.city.toLowerCase().includes(search)),
    );
  }, [companies, filters, route.active]);

  const sorted = useMemo(() => {
    const key = sort.key;
    return [...filtered].sort((a, b) => {
      const av = key === 'strength_score' ? getDisplayScore(a) : (a as unknown as Record<string, unknown>)[key];
      const bv = key === 'strength_score' ? getDisplayScore(b) : (b as unknown as Record<string, unknown>)[key];
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
      setMutationError(e instanceof Error ? e.message : 'Something went wrong.');
      return null;
    }
  }, []);

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
    (originCoord: LatLng, destCoord: LatLng, path: LatLng[] | null, corridorKm: number, cargoType: string) => {
      const usePath = path && path.length >= 2 ? path : [originCoord, destCoord];
      const next = new Map<string, RouteScoreResult>();
      rawCompanies.forEach((c) => {
        next.set(c.id, scoreCompanyAgainstRoute(c, usePath, corridorKm, cargoType));
      });
      setRouteScores(next);
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

  const fetchDirections = useCallback((origin: LatLng, dest: LatLng): Promise<{ path: LatLng[]; result: google.maps.DirectionsResult } | null> => {
    return new Promise((resolve) => {
      if (typeof window === 'undefined' || !window.google?.maps?.DirectionsService) {
        resolve(null);
        return;
      }
      new window.google.maps.DirectionsService().route(
        { origin, destination: dest, travelMode: window.google.maps.TravelMode.DRIVING },
        (result, status) => {
          if (status === 'OK' && result) {
            resolve({ path: result.routes[0].overview_path.map((p) => ({ lat: p.lat(), lng: p.lng() })), result });
          } else {
            resolve(null);
          }
        },
      );
    });
  }, []);

  const runRouteSearch = useCallback(async () => {
    const { originText, destText, corridorKm, cargoType } = route;
    if (!originText.trim() || !destText.trim()) return;
    setRoute((r) => ({ ...r, loading: true, error: '' }));
    const [origin, dest] = await Promise.all([geocodePlace(originText), geocodePlace(destText)]);
    if (!origin || !dest) {
      setRoute((r) => ({ ...r, loading: false, error: 'Could not find one of those places. Try a more specific city name.' }));
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
      directionsResult: directions?.result ?? null,
      active: true,
      loading: false,
      error: directions ? '' : 'Exact driving route unavailable (Directions API) — showing a straight-line corridor instead.',
    }));
    recomputeRouteMatches(origin, dest, path, corridorKm, cargoType);
  }, [route, geocodePlace, fetchDirections, recomputeRouteMatches]);

  const clearRoute = useCallback(() => {
    setRoute((r) => ({
      ...r,
      active: false,
      originCoord: null,
      destCoord: null,
      path: null,
      hasDirections: false,
      directionsResult: null,
      cargoType: '',
      error: '',
    }));
    setRouteScores(new Map());
  }, []);

  // Corridor/cargo knobs recompute scores immediately on change while a search is active —
  // triggered from the setter itself rather than an effect, so there's no synchronous setState
  // cascade. Origin/dest changes go through runRouteSearch instead (needs a fresh geocode call).
  const setCorridorKm = useCallback(
    (corridorKm: number) => {
      setRoute((r) => ({ ...r, corridorKm }));
      if (route.active && route.originCoord && route.destCoord) {
        recomputeRouteMatches(route.originCoord, route.destCoord, route.path, corridorKm, route.cargoType);
      }
    },
    [route.active, route.originCoord, route.destCoord, route.path, route.cargoType, recomputeRouteMatches],
  );

  const setCargoType = useCallback(
    (cargoType: string) => {
      setRoute((r) => ({ ...r, cargoType }));
      if (route.active && route.originCoord && route.destCoord) {
        recomputeRouteMatches(route.originCoord, route.destCoord, route.path, route.corridorKm, cargoType);
      }
    },
    [route.active, route.originCoord, route.destCoord, route.path, route.corridorKm, recomputeRouteMatches],
  );

  // ---- drawer ----
  const setDraft = useCallback((patch: Partial<DrawerDraft>) => setDraftState((d) => ({ ...d, ...patch })), []);

  const openDrawer = useCallback(
    (id: string) => {
      const c = companies.find((x) => x.id === id);
      if (!c) return;
      setSelectedId(id);
      setEditingDetails(false);
      setEditDraftState(null);
      setEditError('');
      setDraftState({ strength: c.strength_score ?? c.route_score ?? 0, rationale: c.strength_rationale, tagChoice: '', activityType: 'Call', activityNote: '' });
      setActivityLoading(true);
      api
        .fetchActivityLog(id)
        .then(setActivityLog)
        .catch(() => setActivityLog([]))
        .finally(() => setActivityLoading(false));
    },
    [companies],
  );

  const closeDrawer = useCallback(() => {
    setSelectedId(null);
    setEditingDetails(false);
    setEditDraftState(null);
    setActivityLog([]);
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

  const addActivity = useCallback(async () => {
    if (!selectedId || !draft.activityNote.trim()) return;
    const entry = await runMutation(() => api.addActivityLogEntryApi(selectedId, draft.activityType, draft.activityNote));
    if (entry) {
      setActivityLog((log) => [entry, ...log]);
      setDraftState((d) => ({ ...d, activityNote: '' }));
    }
  }, [selectedId, draft.activityType, draft.activityNote, runMutation]);

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
      mulda_presence: selected.mulda_presence,
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
      setEditError('Name is required.');
      return;
    }
    const lat = parseFloat(editDraft.lat);
    const lng = parseFloat(editDraft.lng);
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      setEditError('Latitude and longitude must be numbers.');
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
      mulda_presence: editDraft.mulda_presence,
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
      setEditError('Could not save — please try again.');
    }
  }, [selectedId, editDraft, runMutation]);

  // ---- list-level actions ----
  const addCompany = useCallback(async () => {
    const created = await runMutation(() => api.createCompany());
    if (created) {
      setRawCompanies((list) => [created, ...list]);
      openDrawer(created.id);
      setTimeout(startEditDetails, 0);
    }
  }, [runMutation, openDrawer, startEditDetails]);

  const deleteCompanyAction = useCallback(
    async (id: string) => {
      const c = rawCompanies.find((x) => x.id === id);
      if (c && !window.confirm(`Delete "${c.name}"? This cannot be undone.`)) return;
      const ok = await runMutation(() => api.deleteCompanyApi(id));
      if (ok !== null) {
        setRawCompanies((list) => list.filter((x) => x.id !== id));
        if (selectedId === id) closeDrawer();
      }
    },
    [rawCompanies, runMutation, selectedId, closeDrawer],
  );

  const approveCompany = useCallback(
    async (id: string) => {
      const updated = await runMutation(() => api.setPendingReviewApi(id, false));
      if (updated) patchCompanyLocal(updated);
    },
    [runMutation],
  );

  const dismissDuplicate = useCallback(
    async (id: string) => {
      const updated = await runMutation(() => api.setDuplicateDismissedApi(id, true));
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

  const value: CrmContextValue = {
    identity,
    loading,
    loadError,
    view,
    setView,
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
    allCapabilities,
    duplicateCount,
    route,
    setRouteField,
    setCorridorKm,
    setCargoType,
    runRouteSearch,
    clearRoute,
    selectedId,
    selected,
    openDrawer,
    closeDrawer,
    activityLog,
    activityLoading,
    draft,
    setDraft,
    saveStrength,
    addTag,
    removeTag,
    addActivity,
    editingDetails,
    editDraft,
    editError,
    startEditDetails,
    cancelEditDetails,
    setEditField,
    saveEditDetails,
    addCompany,
    deleteCompanyAction,
    approveCompany,
    dismissDuplicate,
    restoreDuplicate,
    mutationError,
  };

  return <CrmContext.Provider value={value}>{children}</CrmContext.Provider>;
}

export function useCrm() {
  const ctx = useContext(CrmContext);
  if (!ctx) throw new Error('useCrm must be used within CrmProvider');
  return ctx;
}
