const LEGAL_SUFFIXES =
  /\b(s\.?r\.?o\.?|a\.?s\.?|spol\.?\s*s\s*r\.?o\.?|kft\.?|gmbh|sp\.?\s*z\s*o\.?o\.?|sro|srl|sarl|s\.?l\.?u?\.?|bv|nv|oy|ab|d\.?o\.?o\.?|ltd\.?|llc|inc\.?|group|logistics?|transport(e|es|i)?|spedition|trans|cargo|international|europe|kg)\b/g;

export function normalizeCompanyName(name: string): string {
  return String(name)
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[.,&'"()/-]/g, ' ')
    .replace(LEGAL_SUFFIXES, ' ')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeDomain(website: string | null | undefined): string {
  if (!website) return '';
  return website
    .toLowerCase()
    .trim()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('/')[0]
    .split('?')[0];
}

// A hub duplicate keeps the original's name (see duplicateCompany in supabase/companies.ts) —
// this note is what actually records the relationship, appended to the copy's description.
export function hubNoteText(originalName: string, hubNumber: number): string {
  return `Hub duplicate ${hubNumber} of "${originalName}".`;
}

// Appends as a new paragraph rather than replacing — description is free text staff have
// already written, not a template slot.
export function appendHubNote(description: string, note: string): string {
  const trimmed = description.trim();
  return trimmed ? `${trimmed}\n\n${note}` : note;
}

// What a merge writes onto the surviving company — the loser is soft-deleted separately
// (see mergeCompanies in supabase/companies.ts). Blank scalar fields on the survivor are
// filled from the loser rather than left empty; array fields are unioned rather than
// replaced; the loser's own description isn't discarded, just folded in as a note, so a
// merge never silently drops context the way overwriting fields would.
export function buildMergedCompanyPatch<
  T extends {
    id: string;
    name: string;
    types: string[];
    country: string;
    region: string;
    city: string;
    website: string;
    email: string;
    phone: string;
    description: string;
    capability_tags: string[];
    trailer_types: string[];
    countries_served: string[];
  },
>(survivor: T, loser: T): Partial<T> {
  const fillBlank = (a: string, b: string) => (a.trim() ? a : b);
  const union = (a: string[], b: string[]) => Array.from(new Set([...a, ...b]));

  const mergeNote = `Merged with "${loser.name}".${loser.description.trim() ? ` Their notes: ${loser.description.trim()}` : ''}`;
  const description = survivor.description.trim() ? `${survivor.description.trim()}\n\n${mergeNote}` : mergeNote;

  return {
    country: fillBlank(survivor.country, loser.country),
    region: fillBlank(survivor.region, loser.region),
    city: fillBlank(survivor.city, loser.city),
    website: fillBlank(survivor.website, loser.website),
    email: fillBlank(survivor.email, loser.email),
    phone: fillBlank(survivor.phone, loser.phone),
    description,
    types: union(survivor.types, loser.types),
    capability_tags: union(survivor.capability_tags, loser.capability_tags),
    trailer_types: union(survivor.trailer_types, loser.trailer_types),
    countries_served: union(survivor.countries_served, loser.countries_served),
  } as Partial<T>;
}

export type DuplicateFlags = {
  hasDuplicateMatch: boolean;
  isDuplicate: boolean;
  duplicateMatches: { id: string; name: string }[];
};

// Flags companies that likely already exist elsewhere in the list — same normalized name
// (ignoring legal suffixes/punctuation) or same website domain. Doesn't merge or delete
// anything; just surfaces it so staff can review and consolidate manually.
export function computeDuplicateFlags<
  T extends { id: string; name: string; website: string; duplicate_dismissed: boolean },
>(companies: T[]): (T & DuplicateFlags)[] {
  const byName = new Map<string, string[]>();
  const byDomain = new Map<string, string[]>();

  companies.forEach((c) => {
    const n = normalizeCompanyName(c.name);
    if (n) {
      const group = byName.get(n);
      if (group) group.push(c.id);
      else byName.set(n, [c.id]);
    }
    const d = normalizeDomain(c.website);
    if (d) {
      const group = byDomain.get(d);
      if (group) group.push(c.id);
      else byDomain.set(d, [c.id]);
    }
  });

  const byId = new Map(companies.map((c) => [c.id, c]));

  return companies.map((c) => {
    const n = normalizeCompanyName(c.name);
    const d = normalizeDomain(c.website);
    const matchIds = new Set<string>();
    (byName.get(n) ?? []).forEach((id) => {
      if (id !== c.id) matchIds.add(id);
    });
    (byDomain.get(d) ?? []).forEach((id) => {
      if (id !== c.id) matchIds.add(id);
    });
    const duplicateMatches = Array.from(matchIds).map((id) => ({ id, name: byId.get(id)!.name }));
    return {
      ...c,
      hasDuplicateMatch: duplicateMatches.length > 0,
      isDuplicate: duplicateMatches.length > 0 && !c.duplicate_dismissed,
      duplicateMatches,
    };
  });
}
