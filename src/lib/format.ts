import type { ActivityType } from '@/types/company';

export function formatTag(t: string): string {
  return String(t)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export type Tier = { fg: string; bg: string; bar: string; label: string };

export function tierColor(score: number | null | undefined): Tier {
  if (score == null) return { fg: '#94a3b8', bg: '#f8fafc', bar: '#cbd5e1', label: 'Unscored' };
  if (score >= 75) return { fg: '#0f766e', bg: '#ccfbf1', bar: '#0d9488', label: 'Strong' };
  if (score >= 50) return { fg: '#92400e', bg: '#fef3c7', bar: '#d97706', label: 'Medium' };
  return { fg: '#475569', bg: '#f1f5f9', bar: '#94a3b8', label: 'Weak' };
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

export function getDisplayScore(c: { strength_score: number | null; route_score?: number | null }): number | null {
  return c.strength_score ?? c.route_score ?? null;
}
