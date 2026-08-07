import type { Company } from '@/types/company';

const COLUMNS = [
  'name',
  'type',
  'country',
  'region',
  'city',
  'lat',
  'lng',
  'capability_tags',
  'trailer_types',
  'strength_score',
  'mulda_presence',
  'pending_review',
  'website',
  'email',
  'phone',
  'description',
] as const;

function escapeCsvField(v: unknown): string {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

// RFC4180-style CSV export of the currently filtered set (not the full dataset).
export function companiesToCsv(companies: Company[]): string {
  const rows = companies.map((c) =>
    COLUMNS.map((key) => {
      if (key === 'capability_tags') return escapeCsvField(c.capability_tags.join('; '));
      if (key === 'trailer_types') return escapeCsvField(c.trailer_types.join('; '));
      return escapeCsvField(c[key]);
    }).join(','),
  );
  return [COLUMNS.join(','), ...rows].join('\n');
}

export function downloadCsv(csv: string, filenamePrefix = 'carriers-export'): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filenamePrefix}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
