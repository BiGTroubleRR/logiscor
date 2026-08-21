import { NON_COUNTRY_OPTIONS } from './countries';

// A company's location only counts as a real address once it has a city on file — a bare
// country (or a placeholder like "Europe (unspecified)") isn't enough to route or geocode
// against, even if lat/lng carry some fallback value.
export function hasPreciseAddress(c: { city: string; country: string }): boolean {
  if (NON_COUNTRY_OPTIONS.includes(c.country)) return false;
  return !!c.city.trim();
}
