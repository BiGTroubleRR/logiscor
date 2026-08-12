// Canonical country list for the company "Country" dropdown/filter — one entry per ISO
// 3166-1 alpha-2 code, name resolved via countryNameFromCode (format.ts's Intl.DisplayNames
// wrapper), so there's exactly one canonical spelling instead of the free-text drift that
// previously let "Czechia" and "Czech Republic" (and bare codes like "CZ" from earlier
// imports) coexist as separate filter entries for the same country.
import { countryNameFromCode } from './format';
import { ISO_3166_1_ALPHA_2_CODES } from './lane-codes';

export type CountryOption = { code: string; name: string };

export const COUNTRY_OPTIONS: CountryOption[] = ISO_3166_1_ALPHA_2_CODES.map((code) => ({
  code,
  name: countryNameFromCode(code),
})).sort((a, b) => a.name.localeCompare(b.name));

// Non-ISO placeholder values already present in existing data (and worth keeping selectable)
// — no country, so no canonical code and no flag.
export const NON_COUNTRY_OPTIONS = ['Unknown', 'Europe (unspecified)'];

// Legacy free-text country values (full names, alternate spellings, or bare codes already
// written into `country` by earlier imports) mapped to their canonical ISO code — lets both
// existing companies and the filter/display logic converge on one spelling per country
// without needing to rewrite the stored data. Keyed lowercase for case-insensitive lookup.
const LEGACY_ALIASES: Record<string, string> = {
  'czech republic': 'CZ',
  czechia: 'CZ',
  poland: 'PL',
  slovakia: 'SK',
  slovenia: 'SI',
  croatia: 'HR',
  hungary: 'HU',
  italy: 'IT',
  germany: 'DE',
  romania: 'RO',
  turkey: 'TR',
  türkiye: 'TR',
  austria: 'AT',
  lithuania: 'LT',
  bulgaria: 'BG',
  spain: 'ES',
  netherlands: 'NL',
  serbia: 'RS',
  belgium: 'BE',
  'united states': 'US',
  france: 'FR',
  japan: 'JP',
  'united arab emirates': 'AE',
  'united kingdom': 'GB',
  estonia: 'EE',
  'north macedonia': 'MK',
};

const CODE_SET = new Set(ISO_3166_1_ALPHA_2_CODES);

// Resolves any raw stored `country` value (canonical name, legacy alias, or bare code) to its
// ISO code — or null for values with no known mapping (e.g. "Unknown").
export function resolveCountryCode(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.length === 2 && CODE_SET.has(trimmed.toUpperCase())) return trimmed.toUpperCase();
  return LEGACY_ALIASES[trimmed.toLowerCase()] ?? null;
}

// The one canonical display name for a raw stored country value — falls back to the raw
// value untouched when it doesn't resolve to a real country (e.g. "Unknown").
export function canonicalCountryName(raw: string): string {
  const code = resolveCountryCode(raw);
  return code ? countryNameFromCode(code) : raw;
}

// ISO 3166-1 alpha-3 codes for the compact table cell (flag + short code next to the company
// name, rather than a whole separate column) — covers the countries actually likely to appear
// in this app's data; falls back to the alpha-2 code for anything not listed here rather than
// requiring exhaustive alpha-3 coverage of all ~250 codes.
const ALPHA_3_OVERRIDES: Record<string, string> = {
  AT: 'AUT', BE: 'BEL', BG: 'BGR', CZ: 'CZE', DE: 'DEU', EE: 'EST', ES: 'ESP', FR: 'FRA',
  GB: 'GBR', HR: 'HRV', HU: 'HUN', IT: 'ITA', JP: 'JPN', LT: 'LTU', MK: 'MKD', NL: 'NLD',
  PL: 'POL', RO: 'ROU', RS: 'SRB', SI: 'SVN', SK: 'SVK', TR: 'TUR', US: 'USA', AE: 'ARE',
  CH: 'CHE', DK: 'DNK', FI: 'FIN', GR: 'GRC', IE: 'IRL', LU: 'LUX', LV: 'LVA', NO: 'NOR',
  PT: 'PRT', SE: 'SWE', UA: 'UKR', BY: 'BLR', MD: 'MDA', RU: 'RUS', CA: 'CAN', AU: 'AUS',
  CN: 'CHN', IN: 'IND', BR: 'BRA', MX: 'MEX', ZA: 'ZAF', KR: 'KOR',
};

export function shortCountryCode(code: string): string {
  const upper = code.trim().toUpperCase();
  return ALPHA_3_OVERRIDES[upper] ?? upper;
}
