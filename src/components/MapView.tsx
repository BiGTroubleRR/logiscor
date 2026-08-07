'use client';

import { useEffect, useRef, useState } from 'react';
import { MarkerClusterer, SuperClusterAlgorithm } from '@googlemaps/markerclusterer';
import { useCrm } from '@/contexts/CrmContext';
import { loadGoogleMaps } from '@/lib/google-maps-loader';
import { getDisplayScore, tierColor } from '@/lib/format';
import type { CompanyView } from '@/types/company';

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';

function debounce<T extends (...args: never[]) => void>(fn: T, wait: number): T {
  let t: ReturnType<typeof setTimeout>;
  return ((...args: never[]) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  }) as T;
}

export default function MapView() {
  const { filtered, route, openDrawer } = useCrm();
  const mapDivRef = useRef<HTMLDivElement | null>(null);
  const [mapsReady, setMapsReady] = useState(false);

  const gmapRef = useRef<google.maps.Map | null>(null);
  const markerMapRef = useRef<Map<string, google.maps.Marker>>(new Map());
  const clustererRef = useRef<MarkerClusterer | null>(null);
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);
  const routeLineRef = useRef<google.maps.Polyline | null>(null);
  const routeMarkersRef = useRef<google.maps.Marker[]>([]);
  const boundsFitRef = useRef(false);
  const routeBoundsFitRef = useRef(false);
  const lastFilteredRef = useRef<CompanyView[]>([]);

  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY) return;
    loadGoogleMaps(GOOGLE_MAPS_API_KEY)
      .then(() => setMapsReady(true))
      .catch(() => setMapsReady(false));
  }, []);

  // Init map once.
  useEffect(() => {
    if (!mapsReady || !mapDivRef.current || gmapRef.current) return;
    const g = window.google.maps;
    const gmap = new g.Map(mapDivRef.current, {
      center: { lat: 49.8, lng: 16.5 },
      zoom: 5,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    });
    gmapRef.current = gmap;

    const updateVisibleMarkers = debounce(() => {
      if (!clustererRef.current) return;
      const bounds = gmap.getBounds();
      if (!bounds) return;
      const sw = bounds.getSouthWest();
      const ne = bounds.getNorthEast();
      const padded = new g.LatLngBounds({ lat: sw.lat() - 1, lng: sw.lng() - 1 }, { lat: ne.lat() + 1, lng: ne.lng() + 1 });
      const visible = lastFilteredRef.current.filter((c) => padded.contains({ lat: c.lat, lng: c.lng }));
      const markers = visible.map((c) => getOrCreateMarker(c));
      clustererRef.current.clearMarkers();
      clustererRef.current.addMarkers(markers);
    }, 150);

    gmap.addListener('bounds_changed', updateVisibleMarkers);
    gmap.addListener('zoom_changed', updateVisibleMarkers);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapsReady]);

  function getOrCreateMarker(c: CompanyView): google.maps.Marker {
    const g = window.google.maps;
    const score = getDisplayScore(c);
    const tier = tierColor(score);
    const iconKey = tier.bar + ':' + score;
    const scale = score == null ? 5 : 6 + (score / 100) * 9;
    const icon: google.maps.Symbol = { path: g.SymbolPath.CIRCLE, scale, fillColor: tier.bar, fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2 };
    const label: google.maps.MarkerLabel | undefined =
      score == null ? undefined : { text: String(score), color: '#fff', fontSize: '10px', fontWeight: '700' };

    let m = markerMapRef.current.get(c.id);
    if (!m) {
      m = new g.Marker({ position: { lat: c.displayLat, lng: c.displayLng }, icon, label, title: c.name });
      m.addListener('click', () => openDrawer(c.id));
      (m as unknown as { _iconKey?: string })._iconKey = iconKey;
      markerMapRef.current.set(c.id, m);
    } else if ((m as unknown as { _iconKey?: string })._iconKey !== iconKey) {
      m.setIcon(icon);
      m.setLabel(label ?? null);
      (m as unknown as { _iconKey?: string })._iconKey = iconKey;
    }
    return m;
  }

  function syncRouteOverlay() {
    const g = window.google.maps;
    const gmap = gmapRef.current!;
    const { active, originCoord, destCoord, hasDirections, directionsResult } = route;

    if (directionsRendererRef.current) directionsRendererRef.current.setMap(null);
    if (routeLineRef.current) {
      routeLineRef.current.setMap(null);
      routeLineRef.current = null;
    }
    routeMarkersRef.current.forEach((m) => m.setMap(null));
    routeMarkersRef.current = [];

    if (!active || !originCoord || !destCoord) return;

    if (hasDirections && directionsResult) {
      if (!directionsRendererRef.current) {
        directionsRendererRef.current = new g.DirectionsRenderer({
          suppressMarkers: false,
          polylineOptions: { strokeColor: '#0f172a', strokeOpacity: 0.75, strokeWeight: 4 },
        });
      }
      directionsRendererRef.current.setMap(gmap);
      directionsRendererRef.current.setDirections(directionsResult);
    } else {
      routeLineRef.current = new g.Polyline({
        path: [originCoord, destCoord],
        map: gmap,
        strokeColor: '#0f172a',
        strokeOpacity: 0.6,
        strokeWeight: 3,
        icons: [{ icon: { path: 'M 0,-1 0,1', strokeOpacity: 1, scale: 3 }, offset: '0', repeat: '14px' }],
      });
      routeMarkersRef.current = [originCoord, destCoord].map(
        (pt, i) =>
          new g.Marker({
            position: pt,
            map: gmap,
            title: i === 0 ? 'Origin' : 'Destination',
            icon: { path: g.SymbolPath.BACKWARD_CLOSED_ARROW, rotation: 0, scale: 6, fillColor: i === 0 ? '#2563eb' : '#dc2626', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2 },
          }),
      );
    }

    if (!routeBoundsFitRef.current) {
      const bounds = new g.LatLngBounds();
      bounds.extend(originCoord);
      bounds.extend(destCoord);
      gmap.fitBounds(bounds, 60);
      routeBoundsFitRef.current = true;
    }
  }

  // Sync markers/route whenever the filtered set or route changes.
  useEffect(() => {
    if (!mapsReady || !gmapRef.current) return;
    const g = window.google.maps;
    const gmap = gmapRef.current;
    lastFilteredRef.current = filtered;

    if (!clustererRef.current) {
      clustererRef.current = new MarkerClusterer({ map: gmap, markers: [], algorithm: new SuperClusterAlgorithm({ maxZoom: 15, radius: 60 }) });
    }
    const bounds = gmap.getBounds();
    if (bounds) {
      const sw = bounds.getSouthWest();
      const ne = bounds.getNorthEast();
      const padded = new g.LatLngBounds({ lat: sw.lat() - 1, lng: sw.lng() - 1 }, { lat: ne.lat() + 1, lng: ne.lng() + 1 });
      const visible = filtered.filter((c) => padded.contains({ lat: c.lat, lng: c.lng }));
      const markers = visible.map((c) => getOrCreateMarker(c));
      clustererRef.current.clearMarkers();
      clustererRef.current.addMarkers(markers);
    }

    syncRouteOverlay();

    if (!route.active && !boundsFitRef.current && filtered.length) {
      const bounds2 = new g.LatLngBounds();
      filtered.forEach((c) => bounds2.extend({ lat: c.lat, lng: c.lng }));
      gmap.fitBounds(bounds2);
      boundsFitRef.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapsReady, filtered, route.active, route.originCoord, route.destCoord, route.hasDirections, route.directionsResult]);

  useEffect(() => {
    if (!route.active) routeBoundsFitRef.current = false;
  }, [route.active]);

  return (
    <div style={{ flex: 1, position: 'relative', overflow: 'hidden', background: '#e2e8f0' }}>
      <div ref={mapDivRef} style={{ position: 'absolute', inset: 0 }} />

      {!GOOGLE_MAPS_API_KEY && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#e2e8f0' }}>
          <div style={{ background: '#fff', borderRadius: 10, padding: '24px 28px', maxWidth: 340, textAlign: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.12)' }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a', marginBottom: 6 }}>Google Maps API key needed</div>
            <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>
              Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY (with the Maps JavaScript API enabled) to plot carriers on the live map.
            </div>
          </div>
        </div>
      )}

      <div style={{ position: 'absolute', top: 16, left: 16, background: '#fff', borderRadius: 10, boxShadow: '0 2px 12px rgba(0,0,0,0.15)', padding: 12, display: 'flex', flexDirection: 'column', gap: 10, width: 200 }}>
        <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.4 }}>
          {route.active ? 'Showing only companies within the searched corridor, colored by relevance.' : 'Run a route search above to score and highlight relevant companies.'}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {[
            { color: '#0d9488', label: 'Strong (75+)' },
            { color: '#d97706', label: 'Medium (50-74)' },
            { color: '#94a3b8', label: 'Weak (<50)' },
            { color: '#cbd5e1', label: 'Unscored' },
          ].map((row) => (
            <div key={row.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#334155' }}>
              <span style={{ width: 10, height: 10, borderRadius: 999, background: row.color, display: 'inline-block' }} />
              {row.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
