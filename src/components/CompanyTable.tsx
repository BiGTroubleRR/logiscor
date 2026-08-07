'use client';

import type { CSSProperties } from 'react';
import { useCrm, type SortKey } from '@/contexts/CrmContext';
import { formatTag, getDisplayScore, tierColor, typeColor } from '@/lib/format';
import { ROW_COLORS } from '@/lib/row-colors';
import type { CompanyView } from '@/types/company';

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

function Row({ c }: { c: CompanyView }) {
  const { openDrawer, dismissDuplicate, deleteCompanyAction, setLabelColor, route } = useCrm();
  const score = getDisplayScore(c);
  const tier = tierColor(score);
  const visibleTags = c.capability_tags.slice(0, 2);
  const extraCount = c.capability_tags.length - 2;
  const visibleTrailerTypes = c.trailer_types.slice(0, 2);
  const extraTrailerTypeCount = c.trailer_types.length - 2;

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
          {c.isDuplicate && (
            <>
              <span
                title={`Possibly same as: ${c.duplicateMatches.map((m) => m.name).join(', ')}`}
                style={{ background: '#fee2e2', color: '#991b1b', fontSize: 10, padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}
              >
                DUP?
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  dismissDuplicate(c.id);
                }}
                title="Not a duplicate — dismiss"
                style={{ border: 'none', background: 'none', color: '#991b1b', fontSize: 10, textDecoration: 'underline', cursor: 'pointer', padding: 0 }}
              >
                dismiss
              </button>
            </>
          )}
        </div>
      </td>
      <td style={td}>
        <span
          style={{
            background: `${typeColor(c.type)}1a`,
            color: typeColor(c.type),
            fontSize: 11,
            fontWeight: 600,
            padding: '3px 9px',
            borderRadius: 999,
          }}
        >
          {formatTag(c.type)}
        </span>
      </td>
      <td style={{ ...td, color: '#334155' }}>{c.country}</td>
      <td style={{ ...td, color: '#334155' }}>
        {c.region || '—'}
        <div style={{ fontSize: 11, color: '#94a3b8' }}>{c.city}</div>
      </td>
      <td style={td}>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {visibleTags.map((tag) => (
            <span key={tag} style={{ background: '#f1f5f9', color: '#334155', fontSize: 11, padding: '3px 8px', borderRadius: 999 }}>
              {formatTag(tag)}
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
          <span style={{ fontWeight: 600, fontSize: 12, width: 24, textAlign: 'right', color: '#334155' }}>{score ?? '—'}</span>
        </div>
      </td>
      <td style={{ ...td, textAlign: 'center', color: '#334155', fontWeight: 600 }}>{c.route_score ?? '—'}</td>
      <td style={td}>
        {c.trailer_types.length === 0 ? (
          <span style={{ color: '#cbd5e1' }}>—</span>
        ) : (
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {visibleTrailerTypes.map((t) => (
              <span key={t} style={{ background: '#f1f5f9', color: '#334155', fontSize: 11, padding: '3px 8px', borderRadius: 999 }}>
                {t}
              </span>
            ))}
            {extraTrailerTypeCount > 0 && (
              <span style={{ background: '#f1f5f9', color: '#94a3b8', fontSize: 11, padding: '3px 8px', borderRadius: 999 }}>+{extraTrailerTypeCount}</span>
            )}
          </div>
        )}
      </td>
      <td style={{ ...td, textAlign: 'right', color: '#64748b' }}>
        {route.active && (c.distance_to_origin_km != null || c.distance_to_dest_km != null) ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: 11 }}>
            {c.distance_to_origin_km != null && <div>{c.distance_to_origin_km} km from origin</div>}
            {c.distance_to_dest_km != null && <div>{c.distance_to_dest_km} km from dest.</div>}
          </div>
        ) : (
          '—'
        )}
      </td>
      <td style={{ ...td, textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
        <select
          value={c.label_color}
          onChange={(e) => setLabelColor(c.id, e.target.value)}
          title="Row color"
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
          <option value="">None</option>
          {ROW_COLORS.map((rc) => (
            <option key={rc.hex} value={rc.hex} style={{ background: rc.hex, color: '#fff' }}>
              {rc.name}
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
          title="Delete company"
          style={{ border: 'none', background: 'none', color: '#cbd5e1', fontSize: 14, cursor: 'pointer', padding: '2px 4px' }}
        >
          🗑
        </button>
      </td>
    </tr>
  );
}

export default function CompanyTable() {
  const { sorted, route } = useCrm();
  const distanceLabel = route.active ? 'Distance (Origin / Dest.)' : 'Distance';

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px' }}>
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, overflowX: 'auto' }}>
        <table style={{ width: '100%', minWidth: 1000, borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <SortHeader label="Company" sortKey="name" />
              <SortHeader label="Type" sortKey="type" />
              <SortHeader label="Country" sortKey="country" />
              <SortHeader label="Region / City" sortKey="region" />
              <th style={thStyleNoSort}>Capabilities</th>
              <SortHeader label="Strength" sortKey="strength_score" />
              <SortHeader label="Route Score" sortKey="route_score" />
              <th style={thStyleNoSort}>Trailer Types</th>
              <SortHeader label={distanceLabel} sortKey="distance_km" />
              <th style={thStyleNoSort}>Color</th>
              <th style={thStyleRight} />
            </tr>
          </thead>
          <tbody>
            {sorted.map((c) => (
              <Row key={c.id} c={c} />
            ))}
          </tbody>
        </table>
        {sorted.length === 0 && (
          <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>No carriers match these filters.</div>
        )}
      </div>
    </div>
  );
}
