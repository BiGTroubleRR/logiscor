// Great-circle distance (km) between two points.
export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// Shortest distance (km) from a point to the route segment A-B, via flat-earth projection
// (fine at this regional scale) so we can tell how far a company sits off a searched route.
export function distanceToSegmentKm(
  lat: number,
  lng: number,
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): number {
  const kmPerDegLat = 111.32;
  const kmPerDegLng = 111.32 * Math.cos((aLat * Math.PI) / 180);
  const px = (lng - aLng) * kmPerDegLng;
  const py = (lat - aLat) * kmPerDegLat;
  const dx = (bLng - aLng) * kmPerDegLng;
  const dy = (bLat - aLat) * kmPerDegLat;
  const lenSq = dx * dx + dy * dy;
  let t = lenSq === 0 ? 0 : (px * dx + py * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const cx = dx * t - px;
  const cy = dy * t - py;
  return Math.sqrt(cx * cx + cy * cy);
}

export type LatLng = { lat: number; lng: number };

// Shortest distance (km) from a point to a multi-point path (the real driving route when available).
export function distanceToPathKm(lat: number, lng: number, path: LatLng[]): number {
  let min = Infinity;
  for (let i = 0; i < path.length - 1; i++) {
    const d = distanceToSegmentKm(lat, lng, path[i].lat, path[i].lng, path[i + 1].lat, path[i + 1].lng);
    if (d < min) min = d;
  }
  return min;
}

// Companies scraped for the same city/anchor point often share identical (or near-identical)
// coordinates. Clustering-distance settings can't separate literal overlaps, so give each
// member of a coincident group a tiny deterministic offset (imperceptible zoomed out, clearly
// separated once zoomed in close) purely for marker placement.
export function spreadOverlappingCoords<T extends { lat: number; lng: number }>(
  companies: T[],
): (T & { displayLat: number; displayLng: number })[] {
  const groups = new Map<string, T[]>();
  companies.forEach((c) => {
    const key = c.lat.toFixed(3) + ',' + c.lng.toFixed(3);
    const group = groups.get(key);
    if (group) group.push(c);
    else groups.set(key, [c]);
  });

  const out = new Map<T, { displayLat: number; displayLng: number }>();
  groups.forEach((group) => {
    const n = group.length;
    if (n === 1) {
      out.set(group[0], { displayLat: group[0].lat, displayLng: group[0].lng });
      return;
    }
    const R = 0.0012;
    group.forEach((c, i) => {
      const angle = (2 * Math.PI * i) / n;
      out.set(c, {
        displayLat: c.lat + R * Math.sin(angle),
        displayLng: c.lng + (R * Math.cos(angle)) / Math.cos((c.lat * Math.PI) / 180),
      });
    });
  });

  return companies.map((c) => ({ ...c, ...out.get(c)! }));
}
