'use client';

import { useCrm } from '@/contexts/CrmContext';
import { darkInputStyle, tealButtonStyle, outlineButtonStyle } from '@/lib/styles';
import { formatTag } from '@/lib/format';

export default function RouteSearchBar() {
  const { route, setRouteField, setCorridorKm, setCargoType, runRouteSearch, clearRoute, capabilityOptions } = useCrm();

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
        Route Search
      </span>
      <input
        type="text"
        value={route.originText}
        onChange={(e) => setRouteField({ originText: e.target.value })}
        placeholder="Origin city..."
        style={{ ...darkInputStyle, width: 150 }}
      />
      <span style={{ color: '#64748b' }}>→</span>
      <input
        type="text"
        value={route.destText}
        onChange={(e) => setRouteField({ destText: e.target.value })}
        placeholder="Destination city..."
        style={{ ...darkInputStyle, width: 150 }}
      />
      <select value={route.cargoType} onChange={(e) => setCargoType(e.target.value)} style={darkInputStyle}>
        <option value="">Any cargo type</option>
        {capabilityOptions.map((o) => (
          <option key={o.value} value={o.value}>
            {formatTag(o.label)}
          </option>
        ))}
      </select>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#cbd5e1' }}>
        <span>Corridor {route.corridorKm} km</span>
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
        {route.loading ? 'Searching…' : 'Search'}
      </button>
      {route.active && (
        <button onClick={clearRoute} style={outlineButtonStyle}>
          Clear route
        </button>
      )}
      {route.error && <span style={{ fontSize: 12, color: '#fca5a5' }}>{route.error}</span>}
      {route.active && !route.error && (
        <span style={{ fontSize: 12, color: '#94a3b8' }}>Broaden the corridor slider to widen the search without re-typing places.</span>
      )}
    </div>
  );
}
