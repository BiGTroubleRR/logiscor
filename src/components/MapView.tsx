'use client';

import { useEffect, useRef, useState } from 'react';
import { useCrm } from '@/contexts/CrmContext';
import { useLocale } from '@/contexts/LocaleContext';
import { tierColor } from '@/lib/format';
import { debounce } from '@/lib/debounce';
import type { CompanyView } from '@/types/company';
import type * as LeafletNS from 'leaflet';

// External stylesheets — safe to import directly in a client component under the App Router
// (see next.config.ts's neighbor note on Leaflet needing no API key/script tag, unlike the
// Google Maps loader this replaced).
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';

// Company-name labels under each marker only render past this zoom — below it there are
// hundreds of markers on screen at once and labels would be unreadable clutter.
const LABEL_MIN_ZOOM = 12;

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// Bounds for the initial view, trimming the outer 10% of the lat/lng spread on each side first —
// otherwise a handful of far-flung entries (a lone company in Japan, say, among hundreds
// clustered in Europe) would drag the default view out to a near-world zoom just to include
// them. Skipped below ~20 companies, where "outlier" and "real data" aren't reliably distinguishable.
function initialFitBounds(companies: { lat: number; lng: number }[]): [[number, number], [number, number]] {
  const lats = companies.map((c) => c.lat).sort((a, b) => a - b);
  const lngs = companies.map((c) => c.lng).sort((a, b) => a - b);
  const n = lats.length;
  const trim = n > 20 ? Math.floor(n * 0.1) : 0;
  const lo = trim;
  const hi = n - 1 - trim;
  return [
    [lats[lo], lngs[lo]],
    [lats[hi], lngs[hi]],
  ];
}

// Leaflet touches `document`/`navigator` at module-evaluation time for feature detection, which
// crashes during SSR — so the library itself is dynamic-imported inside an effect (client-only),
// never as a static top-level import. Only the CSS above and this type-only import are static.
function markerIcon(L: typeof LeafletNS, c: CompanyView): LeafletNS.DivIcon {
  const score = c.strength_score;
  const tier = tierColor(score);
  const size = score == null ? 16 : 18 + Math.round((score / 100) * 16);
  const fontSize = size <= 20 ? 9 : 10;
  const html = `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${tier.bar};border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;color:#fff;font-size:${fontSize}px;font-weight:700;">${score ?? ''}</div>`;
  return L.divIcon({ html, className: 'lgs-marker-icon', iconSize: [size, size], iconAnchor: [size / 2, size / 2] });
}

export default function MapView() {
  const { mapFiltered: filtered, showHubsOnMap, setShowHubsOnMap, route, openDrawer } = useCrm();
  const { t } = useLocale();
  const mapDivRef = useRef<HTMLDivElement | null>(null);
  const [leafletReady, setLeafletReady] = useState(false);

  const leafletRef = useRef<typeof LeafletNS | null>(null);
  const mapRef = useRef<LeafletNS.Map | null>(null);
  const markerMapRef = useRef<Map<string, LeafletNS.Marker>>(new Map());
  const clusterGroupRef = useRef<LeafletNS.MarkerClusterGroup | null>(null);
  const routeLineRef = useRef<LeafletNS.Polyline | null>(null);
  const routeMarkersRef = useRef<LeafletNS.Marker[]>([]);
  const boundsFitRef = useRef(false);
  const routeBoundsFitRef = useRef(false);
  const lastFilteredRef = useRef<CompanyView[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const leafletModule = await import('leaflet');
      // leaflet.markercluster mutates the plain CJS `leaflet` module object (adding
      // L.markerClusterGroup) rather than exporting anything itself — bundlers only surface that
      // mutation through the module's `.default`, not through the synthesized ESM namespace
      // object, so unwrap to `.default` before the plugin import runs.
      const L = (leafletModule as unknown as { default?: typeof LeafletNS }).default ?? leafletModule;
      await import('leaflet.markercluster');
      if (cancelled) return;
      leafletRef.current = L;
      setLeafletReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function getOrCreateMarker(c: CompanyView): LeafletNS.Marker {
    const L = leafletRef.current!;
    const score = c.strength_score;
    const iconKey = tierColor(score).bar + ':' + score;

    let m = markerMapRef.current.get(c.id);
    if (!m) {
      m = L.marker([c.displayLat, c.displayLng], { icon: markerIcon(L, c), title: c.name });
      m.on('click', () => openDrawer(c.id));
      // A permanent tooltip rather than baking the name into the icon's own HTML — tooltips
      // render in Leaflet's tooltipPane, above every marker's pane, so a neighboring marker's
      // circle (created later, later in the DOM) can never paint over this label. Icon-embedded
      // labels shared the markerPane with every circle and lost that fight in dense clusters.
      m.bindTooltip(escapeHtml(c.name), { permanent: true, direction: 'bottom', className: 'lgs-marker-label', offset: [0, 2] });
      (m as unknown as { _iconKey?: string })._iconKey = iconKey;
      markerMapRef.current.set(c.id, m);
    } else if ((m as unknown as { _iconKey?: string })._iconKey !== iconKey) {
      m.setIcon(markerIcon(L, c));
      (m as unknown as { _iconKey?: string })._iconKey = iconKey;
    }
    if (m.getTooltip()?.getContent() !== escapeHtml(c.name)) {
      m.setTooltipContent(escapeHtml(c.name));
    }
    return m;
  }

  function syncRouteOverlay() {
    const L = leafletRef.current!;
    const map = mapRef.current!;
    const { active, originCoord, destCoord, path } = route;

    if (routeLineRef.current) {
      map.removeLayer(routeLineRef.current);
      routeLineRef.current = null;
    }
    routeMarkersRef.current.forEach((m) => map.removeLayer(m));
    routeMarkersRef.current = [];

    if (!active || !originCoord || !destCoord) return;

    const linePath: [number, number][] = (path && path.length >= 2 ? path : [originCoord, destCoord]).map((p) => [p.lat, p.lng]);
    routeLineRef.current = L.polyline(linePath, { color: '#0f172a', weight: 4, opacity: 0.75 }).addTo(map);

    const endpointIcon = (color: string) =>
      L.divIcon({
        html: `<div style="width:16px;height:16px;border-radius:50% 50% 50% 0;background:${color};border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,0.4);transform:rotate(-45deg);"></div>`,
        className: 'lgs-marker-icon',
        iconSize: [16, 16],
        iconAnchor: [8, 16],
      });
    routeMarkersRef.current = [
      L.marker([originCoord.lat, originCoord.lng], { icon: endpointIcon('#2563eb'), title: t.mapView.origin }).addTo(map),
      L.marker([destCoord.lat, destCoord.lng], { icon: endpointIcon('#dc2626'), title: t.mapView.destination }).addTo(map),
    ];

    if (!routeBoundsFitRef.current) {
      map.fitBounds(L.latLngBounds([originCoord.lat, originCoord.lng], [destCoord.lat, destCoord.lng]), { padding: [60, 60] });
      routeBoundsFitRef.current = true;
    }
  }

  // Init map once.
  useEffect(() => {
    if (!leafletReady || !mapDivRef.current || mapRef.current) return;
    const L = leafletRef.current!;
    const map = L.map(mapDivRef.current, { center: [49.8, 16.5], zoom: 5 });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);
    mapRef.current = map;

    const clusterGroup = L.markerClusterGroup({ maxClusterRadius: 60, disableClusteringAtZoom: 15 });
    clusterGroup.addTo(map);
    clusterGroupRef.current = clusterGroup;

    const updateVisibleMarkers = debounce(() => {
      if (!clusterGroupRef.current) return;
      const bounds = map.getBounds().pad(1);
      const visible = lastFilteredRef.current.filter((c) => bounds.contains([c.lat, c.lng]));
      const markers = visible.map((c) => getOrCreateMarker(c));
      clusterGroupRef.current.clearLayers();
      clusterGroupRef.current.addLayers(markers);
      map.getContainer().classList.toggle('lgs-show-labels', map.getZoom() >= LABEL_MIN_ZOOM);
    }, 150);

    map.on('moveend', updateVisibleMarkers);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leafletReady]);

  // Sync markers/route whenever the filtered set or route changes.
  useEffect(() => {
    if (!leafletReady || !mapRef.current) return;
    const map = mapRef.current;
    lastFilteredRef.current = filtered;

    if (clusterGroupRef.current) {
      const bounds = map.getBounds().pad(1);
      const visible = filtered.filter((c) => bounds.contains([c.lat, c.lng]));
      const markers = visible.map((c) => getOrCreateMarker(c));
      clusterGroupRef.current.clearLayers();
      clusterGroupRef.current.addLayers(markers);
    }

    syncRouteOverlay();

    if (!route.active && !boundsFitRef.current && filtered.length) {
      map.fitBounds(initialFitBounds(filtered));
      boundsFitRef.current = true;
    }
    map.getContainer().classList.toggle('lgs-show-labels', map.getZoom() >= LABEL_MIN_ZOOM);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leafletReady, filtered, route.active, route.originCoord, route.destCoord, route.path]);

  useEffect(() => {
    if (!route.active) routeBoundsFitRef.current = false;
  }, [route.active]);

  return (
    <div style={{ flex: 1, position: 'relative', overflow: 'hidden', background: '#e2e8f0' }}>
      <div ref={mapDivRef} style={{ position: 'absolute', inset: 0 }} />

      <div style={{ position: 'absolute', top: 16, left: 16, background: '#fff', borderRadius: 10, boxShadow: '0 2px 12px rgba(0,0,0,0.15)', padding: 12, display: 'flex', flexDirection: 'column', gap: 10, width: 200, zIndex: 1000 }}>
        <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.4 }}>
          {route.active ? t.mapView.corridorOnly : t.mapView.runSearchHint}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {[
            { color: '#0d9488', label: t.mapView.legendStrong },
            { color: '#d97706', label: t.mapView.legendMedium },
            { color: '#94a3b8', label: t.mapView.legendWeak },
            { color: '#cbd5e1', label: t.mapView.legendUnscored },
          ].map((row) => (
            <div key={row.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#334155' }}>
              <span style={{ width: 10, height: 10, borderRadius: 999, background: row.color, display: 'inline-block' }} />
              {row.label}
            </div>
          ))}
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#334155', cursor: 'pointer', borderTop: '1px solid #e2e8f0', paddingTop: 8 }}>
          <input type="checkbox" checked={showHubsOnMap} onChange={(e) => setShowHubsOnMap(e.target.checked)} />
          {t.mapView.showHubs}
        </label>
      </div>
    </div>
  );
}
