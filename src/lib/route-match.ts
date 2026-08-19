import { distanceToPathKm, type LatLng } from './geo';

export type RouteMatchResult = {
  route_distance_km: number;
  routeMatch: boolean;
};

// Whether a company falls within a searched route's corridor, and how far off the route it
// sits — used to filter the company list to a route search and to show "X km from the route"
// in the drawer. No scoring/ranking here; see git history if that's ever wanted back.
export function matchCompanyAgainstRoute(
  company: { lat: number; lng: number },
  path: LatLng[],
  corridorKm: number,
): RouteMatchResult {
  const dist = distanceToPathKm(company.lat, company.lng, path);
  return {
    route_distance_km: Math.round(dist * 10) / 10,
    routeMatch: dist <= corridorKm,
  };
}

// Rate quote origin/destination are free text (see rate_quotes in schema.sql), not geocoded —
// so this is a loose substring match rather than a coordinate comparison, same tolerance level
// as the corridor-based company match above. Either string containing the other lets "Prague"
// match a quote written as "Prague, Czechia".
function textLooselyMatches(a: string, b: string): boolean {
  const an = a.trim().toLowerCase();
  const bn = b.trim().toLowerCase();
  if (!an || !bn) return false;
  return an.includes(bn) || bn.includes(an);
}

export function quoteMatchesRoute(quote: { origin: string; destination: string }, originText: string, destText: string): boolean {
  return textLooselyMatches(quote.origin, originText) && textLooselyMatches(quote.destination, destText);
}

// The bit after the last comma, e.g. "Fót, Hungary" -> "hungary" — free text has no dedicated
// country field, so this is the best available signal for "same country, different city".
// Returns '' when there's no comma to split on, so an un-countried search string (just "Prague")
// never produces a false-positive country match.
function placeCountry(text: string): string {
  const idx = text.lastIndexOf(',');
  return idx === -1 ? '' : text.slice(idx + 1).trim().toLowerCase();
}

export type RouteQuoteMatchTier = 'exact' | 'same_country';

// 'exact': quote's origin/destination loosely match the searched place text (quoteMatchesRoute).
// 'same_country': that failed, but both ends are in the same country as the search — worth
// surfacing (a carrier's rate for a nearby lane is still useful context) as long as it's
// visibly flagged as approximate, not presented as if it were the exact lane quoted.
// null: no usable relationship to the searched route at all.
export function matchRouteQuoteTier(
  quote: { origin: string; destination: string },
  originText: string,
  destText: string,
): RouteQuoteMatchTier | null {
  if (quoteMatchesRoute(quote, originText, destText)) return 'exact';
  const originCountry = placeCountry(originText);
  const destCountry = placeCountry(destText);
  if (!originCountry || !destCountry) return null;
  if (placeCountry(quote.origin) === originCountry && placeCountry(quote.destination) === destCountry) return 'same_country';
  return null;
}
