import { distanceToPathKm, type LatLng } from './geo';

export type RouteScoreInput = {
  id: string;
  lat: number;
  lng: number;
  website: string;
  email: string;
  phone: string;
  capability_tags: string[];
};

export type RouteScoreResult = {
  route_distance_km: number;
  routeMatch: boolean;
  route_score: number | null;
  route_cargo_match: boolean;
};

// Scores a company against a searched corridor: proximity to the route path (closer = higher,
// up to 100), + bonus points for having website/email/phone on file, +20/-25 for cargo-type
// capability match if a cargo type was selected. Ported verbatim from the prototype's
// recomputeRouteMatches so behavior matches exactly.
export function scoreCompanyAgainstRoute(
  company: RouteScoreInput,
  path: LatLng[],
  corridorKm: number,
  cargoType: string,
): RouteScoreResult {
  const dist = distanceToPathKm(company.lat, company.lng, path);
  const match = dist <= corridorKm;
  let score: number | null = null;
  let cargoMatch = false;

  if (match) {
    score = Math.round(100 - (dist / corridorKm) * 60);
    if (company.website) score += 4;
    if (company.email) score += 4;
    if (company.phone) score += 4;
    if (cargoType) {
      cargoMatch = company.capability_tags.includes(cargoType);
      score += cargoMatch ? 20 : -25;
    }
    score = Math.max(5, Math.min(100, score));
  }

  return {
    route_distance_km: Math.round(dist * 10) / 10,
    routeMatch: match,
    route_score: score,
    route_cargo_match: cargoMatch,
  };
}
