'use client';

import { useCrm } from '@/contexts/CrmContext';
import { useLocale } from '@/contexts/LocaleContext';
import { darkInputStyle, tealButtonStyle, outlineButtonStyle } from '@/lib/styles';

export default function RouteSearchBar() {
  const { route, setRouteField, setCorridorKm, runRouteSearch, clearRoute } = useCrm();
  const { t } = useLocale();

  return (
    <div
      style={{
        flex: '0 0 auto',
        background: '#0f172a',
        borderBottom: '1px solid #1e293b',
        padding: '10px 20px',
        display: 'flex',
        flexWrap: 'wrap',
        gap: 10,
        alignItems: 'center',
      }}
    >
      <span style={{ fontSize: 11, fontWeight: 600, color: '#5eead4', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
        {t.routeSearch.heading}
      </span>
      <input
        type="text"
        value={route.originText}
        onChange={(e) => setRouteField({ originText: e.target.value })}
        placeholder={t.routeSearch.originPlaceholder}
        style={{ ...darkInputStyle, width: 150 }}
      />
      <span style={{ color: '#64748b' }}>→</span>
      <input
        type="text"
        value={route.destText}
        onChange={(e) => setRouteField({ destText: e.target.value })}
        placeholder={t.routeSearch.destinationPlaceholder}
        style={{ ...darkInputStyle, width: 150 }}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#cbd5e1' }}>
        <span>{t.routeSearch.corridor(route.corridorKm)}</span>
        <input
          type="range"
          min={10}
          max={300}
          step={10}
          value={route.corridorKm}
          onChange={(e) => setCorridorKm(Number(e.target.value))}
          style={{ width: 110 }}
        />
      </div>
      <button onClick={runRouteSearch} style={tealButtonStyle}>
        {route.loading ? t.routeSearch.searching : t.routeSearch.search}
      </button>
      {route.active && (
        <button onClick={clearRoute} style={outlineButtonStyle}>
          {t.routeSearch.clearRoute}
        </button>
      )}
      {route.error && <span style={{ fontSize: 12, color: '#fca5a5' }}>{route.error}</span>}
      {route.active && route.routeInfo && (
        <span style={{ fontSize: 12, color: '#5eead4', fontWeight: 600 }}>
          {t.routeSearch.routeSummary(route.routeInfo.distanceKm, route.routeInfo.durationMin)}
        </span>
      )}
      {route.active && !route.error && (
        <span style={{ fontSize: 12, color: '#94a3b8' }}>{t.routeSearch.corridorHint}</span>
      )}
    </div>
  );
}
