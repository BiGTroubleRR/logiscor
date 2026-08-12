'use client';

import type { CSSProperties } from 'react';
import { useCrm } from '@/contexts/CrmContext';
import { useLocale } from '@/contexts/LocaleContext';
import { formatDate, formatTag, typeColor } from '@/lib/format';
import { translateOption } from '@/lib/i18n/option-labels';
import type { Company } from '@/types/company';
import CountryLabel from './CountryLabel';

const td: CSSProperties = { padding: '12px 14px' };
const thStyle: CSSProperties = {
  padding: '10px 14px',
  textAlign: 'left',
  fontSize: 11,
  fontWeight: 600,
  color: '#64748b',
  textTransform: 'uppercase',
  letterSpacing: '0.03em',
  whiteSpace: 'nowrap',
};

function Row({ c }: { c: Company }) {
  const { restoreCompanyAction, permanentlyDeleteCompanyAction } = useCrm();
  const { locale, t } = useLocale();
  const trTag = (label: string) => (locale === 'cs' ? translateOption(formatTag(label), 'cs') : formatTag(label));

  return (
    <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
      <td style={td}>
        <div style={{ fontWeight: 600, color: '#0f172a' }}>{c.name}</div>
      </td>
      <td style={td}>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {(c.types.length ? c.types : [c.type]).map((tp) => (
            <span
              key={tp}
              style={{
                background: `${typeColor(tp)}1a`,
                color: typeColor(tp),
                fontSize: 11,
                fontWeight: 600,
                padding: '3px 9px',
                borderRadius: 999,
              }}
            >
              {trTag(tp)}
            </span>
          ))}
        </div>
      </td>
      <td style={{ ...td, color: '#334155' }}>
        <CountryLabel country={c.country} />
      </td>
      <td style={{ ...td, color: '#64748b', fontSize: 12 }}>{t.bin.deletedOn(formatDate(c.deleted_at, locale === 'cs' ? 'cs-CZ' : 'en-US'))}</td>
      <td style={{ ...td, textAlign: 'right' }}>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            onClick={() => restoreCompanyAction(c.id)}
            style={{
              border: '1px solid #0d9488',
              background: '#fff',
              color: '#0d9488',
              fontSize: 12,
              fontWeight: 600,
              padding: '5px 10px',
              borderRadius: 6,
              cursor: 'pointer',
            }}
          >
            {t.bin.restore}
          </button>
          <button
            onClick={() => permanentlyDeleteCompanyAction(c.id)}
            style={{
              border: '1px solid #fecaca',
              background: '#fff',
              color: '#dc2626',
              fontSize: 12,
              fontWeight: 600,
              padding: '5px 10px',
              borderRadius: 6,
              cursor: 'pointer',
            }}
          >
            {t.bin.deleteForever}
          </button>
        </div>
      </td>
    </tr>
  );
}

export default function BinView() {
  const { binCompanies, binLoading, setView } = useCrm();
  const { t } = useLocale();

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>{t.bin.title}</div>
          <div style={{ fontSize: 12, color: '#64748b' }}>{t.bin.subtitle}</div>
        </div>
        <button
          onClick={() => setView('list')}
          style={{ border: 'none', background: 'none', color: '#0d9488', fontSize: 12, fontWeight: 600, textDecoration: 'underline', cursor: 'pointer' }}
        >
          {t.bin.backToList}
        </button>
      </div>

      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, overflowX: 'auto' }}>
        {binLoading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>{t.bin.loading}</div>
        ) : binCompanies.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>{t.bin.empty}</div>
        ) : (
          <table style={{ width: '100%', minWidth: 700, borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={thStyle}>{t.table.colCompany}</th>
                <th style={thStyle}>{t.table.colType}</th>
                <th style={thStyle}>{t.table.colCountry}</th>
                <th style={thStyle} />
                <th style={thStyle} />
              </tr>
            </thead>
            <tbody>
              {binCompanies.map((c) => (
                <Row key={c.id} c={c} />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
