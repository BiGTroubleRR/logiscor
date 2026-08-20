// ISO 3166-1 alpha-2 codes staff can pick from immediately for the Countries Served chip
// list, even before any company has been tagged with them — same reasoning as
// PRESET_CAPABILITIES in capabilities.ts, scoped to the countries this app's data already
// covers (see the country list seeded into companies.country).
export const PRESET_COUNTRY_CODES = [
  'CZ',
  'SK',
  'PL',
  'DE',
  'AT',
  'HU',
  'SI',
  'HR',
  'RO',
  'BG',
  'RS',
  'IT',
  'FR',
  'NL',
  'BE',
  'LT',
];

// Folds newly-resolved country codes (e.g. from a rate quote's geocoded origin/destination —
// see addRateQuote/saveRateQuoteEdit in CrmContext.tsx) into a company's existing
// countries_served, without ever producing a duplicate. Blank/null entries and codes already
// present are silently skipped; existing order is preserved and genuinely new codes are
// appended after it.
export function mergeCountriesServed(existing: string[], toAdd: (string | null | undefined)[]): string[] {
  const merged = [...existing];
  for (const raw of toAdd) {
    if (!raw) continue;
    const code = raw.trim().toUpperCase();
    if (!code || merged.includes(code)) continue;
    merged.push(code);
  }
  return merged;
}
