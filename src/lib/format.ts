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
