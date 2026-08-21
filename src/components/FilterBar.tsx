'use client';

import { useState } from 'react';
import { useCrm } from '@/contexts/CrmContext';
import { useLocale } from '@/contexts/LocaleContext';
import { lightSelectStyle, linkButtonStyle, outlineButtonStyle, primaryButtonStyle } from '@/lib/styles';
import { flagEmoji, formatTag } from '@/lib/format';
import { translateOption } from '@/lib/i18n/option-labels';
import { companiesToCsv, downloadCsv } from '@/lib/csv';
import { downloadCompaniesXlsx } from '@/lib/xlsx-export';
import ImportCompaniesButton from './ImportCompaniesButton';
import RfqEmailModal from './RfqEmailModal';

export default function FilterBar() {
  const {
    filters,
    setFilters,
    clearFilters,
    typeOptions,
    countryOptions,
    capabilityOptions,
    trailerTypeOptions,
    projectOptions,
    duplicateCount,
    manufacturerCount,
    hasQuoteCount,
    filtered,
    addCompany,
    route,
  } = useCrm();
  const { locale, t } = useLocale();
  const trTag = (label: string) => (locale === 'cs' ? translateOption(formatTag(label), 'cs') : formatTag(label));
  const [showRfqModal, setShowRfqModal] = useState(false);

  const recipients = filtered.filter((c) => c.email).map((c) => ({ name: c.name, email: c.email }));

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
      <div style={{ position: 'relative', width: 190 }}>
        <input
          type="text"
          value={filters.search}
          onChange={(e) => setFilters({ search: e.target.value })}
          placeholder={t.filterBar.searchPlaceholder}
          style={{ border: '1px solid #cbd5e1', borderRadius: 6, padding: '8px 26px 8px 10px', fontSize: 13, width: '100%' }}
        />
        {filters.search && (
          <button
            onClick={() => setFilters({ search: '' })}
            title={t.filterBar.clearSearch}
            aria-label={t.filterBar.clearSearch}
            style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 14, padding: 4, lineHeight: 1 }}
          >
            ✕
          </button>
        )}
      </div>

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
            {o.value.length === 2 ? `${flagEmoji(o.value)} ` : ''}
            {translateOption(o.label, locale)}
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

      <select value={filters.project} onChange={(e) => setFilters({ project: e.target.value })} style={lightSelectStyle}>
        <option value="all">{t.filterBar.allProjects}</option>
        {projectOptions.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#334155', border: '1px solid #cbd5e1', borderRadius: 6, padding: '7px 10px', cursor: 'pointer' }}>
        <input type="checkbox" checked={filters.duplicatesOnly} onChange={() => setFilters({ duplicatesOnly: !filters.duplicatesOnly })} />
        {t.filterBar.possibleDuplicatesOnly(duplicateCount)}
      </label>

      {/* Off by default — pure manufacturers are hidden from the list entirely so staff aren't
          nudged into contacting them; this is the only way to see them at all. */}
      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#334155', border: '1px solid #cbd5e1', borderRadius: 6, padding: '7px 10px', cursor: 'pointer' }}>
        <input type="checkbox" checked={filters.manufacturersOnly} onChange={() => setFilters({ manufacturersOnly: !filters.manufacturersOnly })} />
        {t.filterBar.manufacturersOnly(manufacturerCount)}
      </label>

      {/* Only meaningful with a searched lane to have a quote for — hidden the rest of the time
          rather than shown disabled, since there's nothing to explain without route context. */}
      {route.active && (
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#334155', border: '1px solid #cbd5e1', borderRadius: 6, padding: '7px 10px', cursor: 'pointer' }}>
          <input type="checkbox" checked={filters.hasQuoteOnly} onChange={() => setFilters({ hasQuoteOnly: !filters.hasQuoteOnly })} />
          {t.filterBar.hasQuoteOnly(hasQuoteCount)}
        </label>
      )}

      <button onClick={clearFilters} style={linkButtonStyle}>
        {t.filterBar.clearFilters}
      </button>

      <div style={{ flex: 1 }} />

      <button
        onClick={() => setShowRfqModal(true)}
        disabled={recipients.length === 0}
        style={{
          ...outlineButtonStyle,
          background: recipients.length ? '#fff' : '#f1f5f9',
          color: recipients.length ? '#0f172a' : '#94a3b8',
          cursor: recipients.length ? 'pointer' : 'not-allowed',
          fontWeight: 600,
        }}
      >
        {t.filterBar.emailFiltered(recipients.length)}
      </button>
      {showRfqModal && (
        <RfqEmailModal
          companies={recipients}
          onClose={() => setShowRfqModal(false)}
          originText={route.active ? route.originText : undefined}
          destText={route.active ? route.destText : undefined}
        />
      )}
      <button
        onClick={() => downloadCsv(companiesToCsv(filtered))}
        style={{ ...outlineButtonStyle, background: '#fff', color: '#0f172a', fontWeight: 600 }}
      >
        {t.filterBar.exportCsv}
      </button>
      <button
        onClick={() => downloadCompaniesXlsx(filtered)}
        style={{ ...outlineButtonStyle, background: '#fff', color: '#0f172a', fontWeight: 600 }}
      >
        {t.filterBar.exportXlsx}
      </button>
      <ImportCompaniesButton />
      <button onClick={addCompany} style={primaryButtonStyle}>
        {t.filterBar.addCompany}
      </button>
    </div>
  );
}
