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

const HUB_SUFFIX = /\s+HUB\s+(\d+)$/i;

// Strips a trailing " HUB N" suffix so repeated duplication (HUB 2, HUB 3, ...) keeps
// numbering off the same base name instead of stacking suffixes.
function baseCompanyName(name: string): string {
  return name.replace(HUB_SUFFIX, '').trim();
}

// The original company is implicitly "HUB 1" — the first duplicate becomes "HUB 2", the
// next "HUB 3", and so on, based on the highest existing HUB number for that base name.
export function nextHubName(name: string, allNames: string[]): string {
  const base = baseCompanyName(name);
  let maxHub = 1;
  allNames.forEach((n) => {
    if (baseCompanyName(n) !== base) return;
    const match = n.match(HUB_SUFFIX);
    const num = match ? parseInt(match[1], 10) : 1;
    if (num > maxHub) maxHub = num;
  });
  return `${base} HUB ${maxHub + 1}`;
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
