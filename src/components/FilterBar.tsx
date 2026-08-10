'use client';

import { useCrm } from '@/contexts/CrmContext';
import { useLocale } from '@/contexts/LocaleContext';
import { lightSelectStyle, linkButtonStyle, outlineButtonStyle, primaryButtonStyle } from '@/lib/styles';
import { formatTag } from '@/lib/format';
import { translateOption } from '@/lib/i18n/option-labels';
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
    filtered,
    addCompany,
  } = useCrm();
  const { locale, t } = useLocale();
  const trTag = (label: string) => (locale === 'cs' ? translateOption(formatTag(label), 'cs') : formatTag(label));

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
        placeholder={t.filterBar.searchPlaceholder}
        style={{ border: '1px solid #cbd5e1', borderRadius: 6, padding: '8px 10px', fontSize: 13, width: 190 }}
      />

      <select value={filters.type} onChange={(e) => setFilters({ type: e.target.value })} style={lightSelectStyle}>
        <option value="all">{t.filterBar.allTypes}</option>
        {typeOptions.map((o) => (
          <option key={o.value} value={o.value}>
            {trTag(o.label)}
          </option>
        ))}
      </select>

      <select value={filters.country} onChange={(e) => setFilters({ country: e.target.value })} style={lightSelectStyle}>
        <option value="all">{t.filterBar.allCountries}</option>
        {countryOptions.map((o) => (
          <option key={o.value} value={o.value}>
            {translateOption(o.label, locale)}
          </option>
        ))}
      </select>

      <select value={filters.region} onChange={(e) => setFilters({ region: e.target.value })} style={lightSelectStyle}>
        <option value="all">{t.filterBar.allRegions}</option>
        {regionOptions.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      <select value={filters.capability} onChange={(e) => setFilters({ capability: e.target.value })} style={lightSelectStyle}>
        <option value="all">{t.filterBar.allCapabilities}</option>
        {capabilityOptions.map((o) => (
          <option key={o.value} value={o.value}>
            {trTag(o.label)}
          </option>
        ))}
      </select>

      <select value={filters.trailerType} onChange={(e) => setFilters({ trailerType: e.target.value })} style={lightSelectStyle}>
        <option value="all">{t.filterBar.allTrailerTypes}</option>
        {trailerTypeOptions.map((o) => (
          <option key={o.value} value={o.value}>
            {translateOption(o.label, locale)}
          </option>
        ))}
      </select>

      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#334155', border: '1px solid #cbd5e1', borderRadius: 6, padding: '7px 10px', cursor: 'pointer' }}>
        <input type="checkbox" checked={filters.duplicatesOnly} onChange={() => setFilters({ duplicatesOnly: !filters.duplicatesOnly })} />
        {t.filterBar.possibleDuplicatesOnly(duplicateCount)}
      </label>

      <button onClick={clearFilters} style={linkButtonStyle}>
        {t.filterBar.clearFilters}
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
        {t.filterBar.emailFiltered(emailAddrs.length)}
      </button>
      <button
        onClick={() => downloadCsv(companiesToCsv(filtered))}
        style={{ ...outlineButtonStyle, background: '#fff', color: '#0f172a', fontWeight: 600 }}
      >
        {t.filterBar.exportCsv}
      </button>
      <ImportCompaniesButton />
      <button onClick={addCompany} style={primaryButtonStyle}>
        {t.filterBar.addCompany}
      </button>
    </div>
  );
}
