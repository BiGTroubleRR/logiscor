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
