import type { ActivityType } from '@/types/company';

export function formatTag(t: string): string {
  return String(t)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatDate(iso: string | null | undefined, locale: string = 'en-US'): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatDateTime(iso: string | null | undefined, locale: string = 'en-US'): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const date = d.toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' });
  const time = d.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' });
  return `${date}, ${time}`;
}

export type TierKey = 'unscored' | 'strong' | 'medium' | 'weak';
export type Tier = { fg: string; bg: string; bar: string; tierKey: TierKey };

// `tierKey` rather than a literal label — callers look the display text up in the current
// locale's dictionary (t.tiers[tierKey]) instead of getting fixed English text back.
export function tierColor(score: number | null | undefined): Tier {
  if (score == null) return { fg: '#94a3b8', bg: '#f8fafc', bar: '#cbd5e1', tierKey: 'unscored' };
  if (score >= 75) return { fg: '#0f766e', bg: '#ccfbf1', bar: '#0d9488', tierKey: 'strong' };
  if (score >= 50) return { fg: '#92400e', bg: '#fef3c7', bar: '#d97706', tierKey: 'medium' };
  return { fg: '#475569', bg: '#f1f5f9', bar: '#94a3b8', tierKey: 'weak' };
}

const TYPE_COLORS: Record<string, string> = {
  carrier: '#2563eb',
  manufacturer: '#7c3aed',
  port: '#0891b2',
  warehouse: '#ea580c',
};

export function typeColor(type: string): string {
  return TYPE_COLORS[type] ?? '#64748b';
}

const ACTIVITY_TYPE_COLORS: Record<ActivityType, string> = {
  Call: '#2563eb',
  Email: '#7c3aed',
  Meeting: '#059669',
  Note: '#64748b',
};

export function activityTypeColor(type: ActivityType): string {
  return ACTIVITY_TYPE_COLORS[type] ?? '#64748b';
}

// Stored websites are often bare domains ("www.example.com") with no scheme — an <a href> with
// no scheme resolves relative to the current page instead of opening the site, so prepend one.
export function normalizeUrl(website: string): string {
  const trimmed = website.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

// Regional-indicator-symbol arithmetic — no lookup table needed. Each letter of a 2-letter
// ISO 3166-1 alpha-2 code maps to a Unicode regional indicator symbol (U+1F1E6 = 🇦 is 'A'
// + 127397), and a pair of them renders as that country's flag.
export function flagEmoji(code: string): string {
  const upper = code.trim().toUpperCase();
  if (upper.length !== 2) return code;
  return String.fromCodePoint(...Array.from(upper).map((c) => 127397 + c.charCodeAt(0)));
}

export function countryNameFromCode(code: string): string {
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' }).of(code.trim().toUpperCase()) ?? code;
  } catch {
    return code;
  }
}

export type TextSnippet = { before: string; match: string; after: string };

// Finds the first case-insensitive occurrence of `term` in `text` and returns it as three parts
// (context before, the matched substring in its original casing, context after) so callers can
// bold just the match — used to show *why* a free-text field (e.g. notes) matched a search.
export function findSnippet(text: string, term: string, radius = 30): TextSnippet | null {
  const t = term.trim();
  if (!t || !text) return null;
  const idx = text.toLowerCase().indexOf(t.toLowerCase());
  if (idx === -1) return null;
  const start = Math.max(0, idx - radius);
  const end = Math.min(text.length, idx + t.length + radius);
  return {
    before: (start > 0 ? '…' : '') + text.slice(start, idx),
    match: text.slice(idx, idx + t.length),
    after: text.slice(idx + t.length, end) + (end < text.length ? '…' : ''),
  };
}
