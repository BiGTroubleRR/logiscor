'use client';

import { useCrm } from '@/contexts/CrmContext';
import { lightSelectStyle, linkButtonStyle, outlineButtonStyle, primaryButtonStyle } from '@/lib/styles';
import { formatTag } from '@/lib/format';
import { companiesToCsv, downloadCsv } from '@/lib/csv';
import ImportCompaniesButton from './ImportCompaniesButton';

export default function FilterBar() {
  const {
    filters,
    setFilters,
    clearFilters,
    typeOptions,
    countryOptions,
    regionOptions,
    capabilityOptions,
    trailerTypeOptions,
    duplicateCount,
    route,
    filtered,
    addCompany,
  } = useCrm();

  const emailAddrs = Array.from(new Set(filtered.map((c) => c.email).filter(Boolean)));
  const emailHref = emailAddrs.length ? 'mailto:' + emailAddrs.map(encodeURIComponent).join(',') : undefined;

  return (
    <div
      style={{
        flex: '0 0 auto',
        background: '#fff',
        borderBottom: '1px solid #e2e8f0',
        padding: '12px 20px',
        display: 'flex',
        flexWrap: 'wrap',
        gap: 10,
        alignItems: 'center',
      }}
    >
      <input
        type="text"
        value={filters.search}
        onChange={(e) => setFilters({ search: e.target.value })}
        placeholder="Search name or city..."
        style={{ border: '1px solid #cbd5e1', borderRadius: 6, padding: '8px 10px', fontSize: 13, width: 190 }}
      />

      <select value={filters.type} onChange={(e) => setFilters({ type: e.target.value })} style={lightSelectStyle}>
        <option value="all">All types</option>
        {typeOptions.map((o) => (
          <option key={o.value} value={o.value}>
            {formatTag(o.label)}
          </option>
        ))}
      </select>

      <select value={filters.country} onChange={(e) => setFilters({ country: e.target.value })} style={lightSelectStyle}>
        <option value="all">All countries</option>
        {countryOptions.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      <select value={filters.region} onChange={(e) => setFilters({ region: e.target.value })} style={lightSelectStyle}>
        <option value="all">All regions</option>
        {regionOptions.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      <select value={filters.capability} onChange={(e) => setFilters({ capability: e.target.value })} style={lightSelectStyle}>
        <option value="all">All capabilities</option>
        {capabilityOptions.map((o) => (
          <option key={o.value} value={o.value}>
            {formatTag(o.label)}
          </option>
        ))}
      </select>

      <select value={filters.trailerType} onChange={(e) => setFilters({ trailerType: e.target.value })} style={lightSelectStyle}>
        <option value="all">All trailer types</option>
        {trailerTypeOptions.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#334155', border: '1px solid #cbd5e1', borderRadius: 6, padding: '7px 10px', cursor: 'pointer' }}>
        <input type="checkbox" checked={filters.pendingOnly} onChange={() => setFilters({ pendingOnly: !filters.pendingOnly })} />
        Pending review only
      </label>

      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#334155', border: '1px solid #cbd5e1', borderRadius: 6, padding: '7px 10px', cursor: 'pointer' }}>
        <input type="checkbox" checked={filters.duplicatesOnly} onChange={() => setFilters({ duplicatesOnly: !filters.duplicatesOnly })} />
        Possible duplicates only {duplicateCount ? `(${duplicateCount})` : ''}
      </label>

      {route.active && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#334155' }}>
          <span>Min relevance {filters.minStrength}</span>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={filters.minStrength}
            onChange={(e) => setFilters({ minStrength: Number(e.target.value) })}
            style={{ width: 100 }}
          />
        </div>
      )}

      <button onClick={clearFilters} style={linkButtonStyle}>
        Clear filters
      </button>

      <div style={{ flex: 1 }} />

      <button
        onClick={() => emailHref && (window.location.href = emailHref)}
        disabled={!emailHref}
        style={{
          ...outlineButtonStyle,
          background: emailHref ? '#fff' : '#f1f5f9',
          color: emailHref ? '#0f172a' : '#94a3b8',
          cursor: emailHref ? 'pointer' : 'not-allowed',
          fontWeight: 600,
        }}
      >
        ✉ Email Filtered ({emailAddrs.length})
      </button>
      <button
        onClick={() => downloadCsv(companiesToCsv(filtered))}
        style={{ ...outlineButtonStyle, background: '#fff', color: '#0f172a', fontWeight: 600 }}
      >
        ⬇ Export CSV
      </button>
      <ImportCompaniesButton />
      <button onClick={addCompany} style={primaryButtonStyle}>
        + Add Company
      </button>
    </div>
  );
}
