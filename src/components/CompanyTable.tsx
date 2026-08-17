'use client';

import { memo, useMemo, useState, type CSSProperties } from 'react';
import { useCrm, type SortKey } from '@/contexts/CrmContext';
import { useLocale } from '@/contexts/LocaleContext';
import { findSnippet, formatDateTime, formatTag, tierColor, typeColor } from '@/lib/format';
import { ROW_COLORS } from '@/lib/row-colors';
import { translateOption } from '@/lib/i18n/option-labels';
import { getEmailQuality } from '@/lib/email-quality';
import { extractLaneCodes } from '@/lib/lane-codes';
import FlagIcon from './FlagIcon';
import CountryLabel from './CountryLabel';
import type { CompanyView } from '@/types/company';
import type { Dict } from '@/lib/i18n/en';

function emailBadge(c: CompanyView, t: Dict): { label: string; title: string; bg: string; fg: string } | null {
  const quality = getEmailQuality(c);
  if (quality === 'generic') return { label: t.table.genericEmail, title: t.table.genericEmailHint, bg: '#fef3c7', fg: '#92400e' };
  if (quality === 'missing') return { label: t.table.noEmail, title: t.table.noEmailHint, bg: '#fee2e2', fg: '#991b1b' };
  if (quality === 'incomplete') return { label: t.table.incompleteInfo, title: t.table.incompleteInfoHint, bg: '#3f3f46', fg: '#fff' };
  return null;
}

const thStyle: CSSProperties = {
  padding: '10px 14px',
  textAlign: 'left',
  fontSize: 11,
  fontWeight: 600,
  color: '#64748b',
  textTransform: 'uppercase',
  letterSpacing: '0.03em',
  cursor: 'pointer',
  userSelect: 'none',
  whiteSpace: 'nowrap',
};
const thStyleNoSort: CSSProperties = { ...thStyle, cursor: 'default' };
const thStyleRight: CSSProperties = { ...thStyle, textAlign: 'right' };
const td: CSSProperties = { padding: '12px 14px' };

function SortHeader({ label, sortKey }: { label: string; sortKey: SortKey }) {
  const { sort, toggleSort } = useCrm();
  const arrow = sort.key === sortKey ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : '';
  return (
    <th onClick={() => toggleSort(sortKey)} style={thStyle}>
      {label}
      {arrow}
    </th>
  );
}

// Memoized: CrmContext's provider value is a fresh object every render (unrelated state changes
// elsewhere — a keystroke in the drawer, the corridor slider — re-render every consumer), and
// with 500+ rows that would otherwise re-run this whole function every time. `c` itself only
// changes reference when `companies`/`filtered`/`sorted` actually recompute, so this bails out
// on anything else.
const Row = memo(function Row({ c }: { c: CompanyView }) {
  const { openDrawer, dismissDuplicate, deleteCompanyAction, setLabelColor, route, filters } = useCrm();
  const { locale, t } = useLocale();
  const trTag = (label: string) => (locale === 'cs' ? translateOption(formatTag(label), 'cs') : formatTag(label));
  const score = c.strength_score;
  const tier = tierColor(score);
  const visibleTags = c.capability_tags.slice(0, 2);
  const extraCount = c.capability_tags.length - 2;
  const visibleTrailerTypes = c.trailer_types.slice(0, 2);
  const extraTrailerTypeCount = c.trailer_types.length - 2;
  // Structured field first, falling back to a free-text lane-code parse (see lib/lane-codes.ts)
  // for companies whose routes-served were only ever written into the description.
  const routeCodes = c.countries_served.length ? c.countries_served : extractLaneCodes(c.description);
  const visibleRouteCodes = routeCodes.slice(0, 5);
  const extraRouteCodeCount = routeCodes.length - 5;
  const emailFlag = emailBadge(c, t);
  const noteMatch = findSnippet(c.description, filters.search);

  const rowStyle: CSSProperties = c.isDuplicate
    ? { background: '#fef2f2', boxShadow: 'inset 3px 0 0 #dc2626', borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }
    : c.label_color
      ? { background: `${c.label_color}14`, boxShadow: `inset 3px 0 0 ${c.label_color}`, borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }
      : { borderBottom: '1px solid #f1f5f9', cursor: 'pointer' };

  return (
    <tr onClick={() => openDrawer(c.id)} style={rowStyle}>
      <td style={td}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <div style={{ fontWeight: 600, color: '#0f172a' }}>{c.name}</div>
          <CountryLabel country={c.country} compact />
          {c.isDuplicate && (
            <>
              <span
                title={t.table.possiblySameAs(c.duplicateMatches.map((m) => m.name).join(', '))}
                style={{ background: '#fee2e2', color: '#991b1b', fontSize: 10, padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}
              >
                {t.table.dup}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  dismissDuplicate(c.id);
                }}
                title={t.table.notDuplicateDismiss}
                style={{ border: 'none', background: 'none', color: '#991b1b', fontSize: 10, textDecoration: 'underline', cursor: 'pointer', padding: 0 }}
              >
                {t.table.dismiss}
              </button>
            </>
          )}
          {emailFlag && (
            <span
              title={emailFlag.title}
              style={{ background: emailFlag.bg, color: emailFlag.fg, fontSize: 10, padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}
            >
              {emailFlag.label}
            </span>
          )}
        </div>
        {noteMatch && (
          <div style={{ fontSize: 11, color: '#0d9488', marginTop: 3 }} title={c.description}>
            📝 {t.table.foundInNotes}: &ldquo;{noteMatch.before}
            <strong>{noteMatch.match}</strong>
            {noteMatch.after}&rdquo;
          </div>
        )}
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
        {c.region || t.table.dash}
        <div style={{ fontSize: 11, color: '#94a3b8' }}>{c.city}</div>
      </td>
      <td style={td}>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {visibleTags.map((tag) => (
            <span key={tag} style={{ background: '#f1f5f9', color: '#334155', fontSize: 11, padding: '3px 8px', borderRadius: 999 }}>
              {trTag(tag)}
            </span>
          ))}
          {extraCount > 0 && (
            <span style={{ background: '#f1f5f9', color: '#94a3b8', fontSize: 11, padding: '3px 8px', borderRadius: 999 }}>+{extraCount}</span>
          )}
        </div>
      </td>
      <td style={{ ...td, width: 150 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ flex: 1, height: 6, background: '#f1f5f9', borderRadius: 999, overflow: 'hidden' }}>
            <div style={{ width: `${score ?? 0}%`, background: tier.bar, height: 6, borderRadius: 999 }} />
          </div>
          <span style={{ fontWeight: 600, fontSize: 12, width: 24, textAlign: 'right', color: '#334155' }}>{score ?? t.table.dash}</span>
        </div>
      </td>
      <td style={td}>
        {c.trailer_types.length === 0 ? (
          <span style={{ color: '#cbd5e1' }}>{t.table.dash}</span>
        ) : (
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {visibleTrailerTypes.map((tt) => (
              <span key={tt} style={{ background: '#f1f5f9', color: '#334155', fontSize: 11, padding: '3px 8px', borderRadius: 999 }}>
                {translateOption(tt, locale)}
              </span>
            ))}
            {extraTrailerTypeCount > 0 && (
              <span style={{ background: '#f1f5f9', color: '#94a3b8', fontSize: 11, padding: '3px 8px', borderRadius: 999 }}>+{extraTrailerTypeCount}</span>
            )}
          </div>
        )}
      </td>
      <td style={td}>
        {routeCodes.length === 0 ? (
          <span style={{ color: '#cbd5e1' }}>{t.table.dash}</span>
        ) : (
          <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }} title={routeCodes.join(', ')}>
            {visibleRouteCodes.map((code) => <FlagIcon key={code} code={code} title={code} />)}
            {extraRouteCodeCount > 0 && (
              <span style={{ background: '#f1f5f9', color: '#94a3b8', fontSize: 11, padding: '3px 6px', borderRadius: 999 }}>+{extraRouteCodeCount}</span>
            )}
          </div>
        )}
      </td>
      <td style={{ ...td, textAlign: 'right', color: '#64748b' }}>
        {route.active && (c.distance_to_origin_km != null || c.distance_to_dest_km != null) ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: 11 }}>
            {c.distance_to_origin_km != null && <div>{t.table.kmFromOrigin(c.distance_to_origin_km, route.originText)}</div>}
            {c.distance_to_dest_km != null && <div>{t.table.kmFromDest(c.distance_to_dest_km, route.destText)}</div>}
          </div>
        ) : (
          t.table.dash
        )}
      </td>
      <td style={{ ...td, color: '#64748b', fontSize: 12, whiteSpace: 'nowrap' }}>{formatDateTime(c.updated_at, locale === 'cs' ? 'cs-CZ' : 'en-US')}</td>
      <td style={{ ...td, textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
        <select
          value={c.label_color}
          onChange={(e) => setLabelColor(c.id, e.target.value)}
          title={t.table.rowColor}
          style={{
            border: '1px solid #cbd5e1',
            borderRadius: 6,
            padding: '4px 8px',
            fontSize: 11,
            fontWeight: 600,
            background: c.label_color || '#fff',
            color: c.label_color ? '#fff' : '#94a3b8',
            cursor: 'pointer',
            width: 96,
          }}
        >
          <option value="">{t.table.none}</option>
          {ROW_COLORS.map((rc) => (
            <option key={rc.hex} value={rc.hex} style={{ background: rc.hex, color: '#fff' }}>
              {translateOption(rc.name, locale)}
            </option>
          ))}
        </select>
      </td>
      <td style={{ ...td, textAlign: 'right' }}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            deleteCompanyAction(c.id);
          }}
          title={t.table.deleteCompany}
          aria-label={`${t.table.deleteCompany}: ${c.name}`}
          style={{ border: 'none', background: 'none', color: '#cbd5e1', fontSize: 14, cursor: 'pointer', padding: '2px 4px' }}
        >
          🗑
        </button>
      </td>
    </tr>
  );
});

// Paginates instead of virtualizing — a plain <table> can't absolutely-position rows without
// breaking column alignment, and at the dataset sizes this app actually deals with, a lighter
// page-at-a-time render is enough to keep the DOM small without that rewrite risk.
const PAGE_SIZE = 50;

function PaginationBar({ page, totalPages, total, onPageChange }: { page: number; totalPages: number; total: number; onPageChange: (p: number) => void }) {
  const { t } = useLocale();
  if (total === 0) return null;
  const start = (page - 1) * PAGE_SIZE + 1;
  const end = Math.min(page * PAGE_SIZE, total);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderTop: '1px solid #e2e8f0', fontSize: 12, color: '#64748b' }}>
      <div>{t.table.paginationShowing(start, end, total)}</div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          style={{ border: '1px solid #cbd5e1', background: '#fff', color: page <= 1 ? '#cbd5e1' : '#334155', borderRadius: 6, padding: '5px 10px', fontSize: 12, cursor: page <= 1 ? 'not-allowed' : 'pointer' }}
        >
          {t.table.paginationPrev}
        </button>
        <span>{t.table.paginationPageOf(page, totalPages)}</span>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          style={{ border: '1px solid #cbd5e1', background: '#fff', color: page >= totalPages ? '#cbd5e1' : '#334155', borderRadius: 6, padding: '5px 10px', fontSize: 12, cursor: page >= totalPages ? 'not-allowed' : 'pointer' }}
        >
          {t.table.paginationNext}
        </button>
      </div>
    </div>
  );
}

export default function CompanyTable() {
  const { sorted, route, filters, sort } = useCrm();
  const { t } = useLocale();
  const distanceLabel = route.active ? t.table.colDistanceRoute : t.table.colDistance;

  const [page, setPage] = useState(1);
  // Resets to page 1 whenever the filter/sort selection changes — otherwise a narrower result
  // set can leave the view stuck on a now-out-of-range page. Adjusted during render (React's
  // documented pattern for "reset state when a prop changes") rather than in an effect, since
  // setState-in-an-effect here would just trigger an extra cascading render for no benefit.
  const [prevFilters, setPrevFilters] = useState(filters);
  const [prevSort, setPrevSort] = useState(sort);
  if (filters !== prevFilters || sort !== prevSort) {
    setPrevFilters(filters);
    setPrevSort(sort);
    setPage(1);
  }

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const clampedPage = Math.min(page, totalPages);
  const pageRows = useMemo(() => sorted.slice((clampedPage - 1) * PAGE_SIZE, clampedPage * PAGE_SIZE), [sorted, clampedPage]);

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px' }}>
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, overflowX: 'auto' }}>
        <table style={{ width: '100%', minWidth: 1000, borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <SortHeader label={t.table.colCompany} sortKey="name" />
              <SortHeader label={t.table.colType} sortKey="type" />
              <SortHeader label={t.table.colRegionCity} sortKey="region" />
              <th style={thStyleNoSort}>{t.table.colCapabilities}</th>
              <SortHeader label={t.table.colStrength} sortKey="strength_score" />
              <th style={thStyleNoSort}>{t.table.colTrailerTypes}</th>
              <th style={thStyleNoSort}>{t.table.colFlags}</th>
              <SortHeader label={distanceLabel} sortKey="distance_km" />
              <SortHeader label={t.table.colLastModified} sortKey="updated_at" />
              <th style={thStyleNoSort}>{t.table.colColor}</th>
              <th style={thStyleRight} />
            </tr>
          </thead>
          <tbody>
            {pageRows.map((c) => (
              <Row key={c.id} c={c} />
            ))}
          </tbody>
        </table>
        {sorted.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>{t.table.noMatches}</div>
        ) : (
          <PaginationBar page={clampedPage} totalPages={totalPages} total={sorted.length} onPageChange={setPage} />
        )}
      </div>
    </div>
  );
}
