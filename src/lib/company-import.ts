// Shared between the template generator and the import preview/validation flow. Column order
// here is the contract for both — the downloaded template and the parser must agree on it.
import type { CompanyType } from '@/types/company';
import { normalizeCompanyName, normalizeDomain } from './duplicates';

export const IMPORT_HEADERS = [
  'name',
  'type',
  'country',
  'region',
  'city',
  'lat',
  'lng',
  'website',
  'phone',
  'email',
  'description',
  'capability_tags',
  'trailer_types',
  'pending_review',
] as const;

export type ImportHeader = (typeof IMPORT_HEADERS)[number];

export const IMPORT_COLUMN_NOTES: Record<ImportHeader, string> = {
  name: 'Required.',
  type: 'carrier, manufacturer, port, or warehouse. Blank defaults to carrier.',
  country: '',
  region: '',
  city: '',
  lat: 'Required. Decimal degrees, e.g. 48.137.',
  lng: 'Required. Decimal degrees, e.g. 11.575.',
  website: '',
  phone: '',
  email: '',
  description: '',
  capability_tags: 'Semicolon-separated, e.g. "Road Freight; Customs".',
  trailer_types: 'Semicolon-separated, e.g. "Flatbed; Curtainside".',
  pending_review: 'true/false. Blank defaults to true.',
};

const VALID_TYPES: CompanyType[] = ['carrier', 'manufacturer', 'port', 'warehouse'];

export type ImportedCompanyRow = {
  name: string;
  type: CompanyType;
  country: string;
  region: string;
  city: string;
  lat: number;
  lng: number;
  website: string;
  phone: string;
  email: string;
  description: string;
  capability_tags: string[];
  trailer_types: string[];
  pending_review: boolean;
};

export type ImportRowError = { row: number | null; reason: string };
export type ImportValidationResult = { valid: ImportedCompanyRow[]; errors: ImportRowError[] };

function splitList(v: unknown): string[] {
  if (v == null) return [];
  return String(v)
    .split(/[;,]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseBoolean(v: unknown, fallback: boolean): boolean {
  if (v == null || v === '') return fallback;
  const s = String(v).trim().toLowerCase();
  if (['true', 'yes', '1', 'y'].includes(s)) return true;
  if (['false', 'no', '0', 'n'].includes(s)) return false;
  return fallback;
}

// `raw` is one row as a header-keyed object — whatever the parser (ExcelJS or CSV) produced.
// Every cell arrives as `unknown` since spreadsheet cells can be numbers, strings, or null.
export function validateImportRow(raw: Record<string, unknown>, rowNumber: number): ImportedCompanyRow | ImportRowError {
  const name = String(raw.name ?? '').trim();
  if (!name) return { row: rowNumber, reason: 'Name is required.' };

  const rawType = String(raw.type ?? '').trim().toLowerCase();
  const type = (rawType || 'carrier') as CompanyType;
  if (rawType && !VALID_TYPES.includes(type)) {
    return { row: rowNumber, reason: `Invalid type "${raw.type}" — must be one of ${VALID_TYPES.join(', ')}.` };
  }

  const lat = Number(raw.lat);
  const lng = Number(raw.lng);
  if (raw.lat == null || raw.lat === '' || Number.isNaN(lat) || lat < -90 || lat > 90) {
    return { row: rowNumber, reason: 'Latitude is required and must be a number between -90 and 90.' };
  }
  if (raw.lng == null || raw.lng === '' || Number.isNaN(lng) || lng < -180 || lng > 180) {
    return { row: rowNumber, reason: 'Longitude is required and must be a number between -180 and 180.' };
  }

  return {
    name,
    type,
    country: String(raw.country ?? '').trim(),
    region: String(raw.region ?? '').trim(),
    city: String(raw.city ?? '').trim(),
    lat,
    lng,
    website: String(raw.website ?? '').trim(),
    phone: String(raw.phone ?? '').trim(),
    email: String(raw.email ?? '').trim(),
    description: String(raw.description ?? '').trim(),
    capability_tags: splitList(raw.capability_tags),
    trailer_types: splitList(raw.trailer_types),
    pending_review: parseBoolean(raw.pending_review, true),
  };
}

export function validateImportRows(rows: Record<string, unknown>[]): ImportValidationResult {
  const valid: ImportedCompanyRow[] = [];
  const errors: ImportRowError[] = [];
  rows.forEach((raw, i) => {
    const result = validateImportRow(raw, i + 2); // +2: header row is 1, data starts at 2
    if ('reason' in result) errors.push(result);
    else valid.push(result);
  });
  return { valid, errors };
}

export type ImportDuplicatePartition = { unique: ImportedCompanyRow[]; duplicates: ImportRowError[] };

// Cross-checks import rows against companies already in the CRM (by normalized name or website
// domain — same heuristic the "Possible duplicates" table flag uses, see duplicates.ts) and
// against earlier rows in the same file. Matches are dropped rather than imported automatically;
// staff review true duplicates manually instead of ending up with silent double entries.
export function partitionDuplicateRows(
  rows: ImportedCompanyRow[],
  existing: { name: string; website: string }[],
): ImportDuplicatePartition {
  const existingNames = new Set(existing.map((c) => normalizeCompanyName(c.name)).filter(Boolean));
  const existingDomains = new Set(existing.map((c) => normalizeDomain(c.website)).filter(Boolean));
  const seenNames = new Set<string>();
  const seenDomains = new Set<string>();

  const unique: ImportedCompanyRow[] = [];
  const duplicates: ImportRowError[] = [];

  rows.forEach((row) => {
    const n = normalizeCompanyName(row.name);
    const d = normalizeDomain(row.website);
    const matchesExisting = (!!n && existingNames.has(n)) || (!!d && existingDomains.has(d));
    const matchesEarlierRow = (!!n && seenNames.has(n)) || (!!d && seenDomains.has(d));

    if (matchesExisting || matchesEarlierRow) {
      duplicates.push({
        row: null,
        reason: `"${row.name}" skipped — ${matchesExisting ? 'matches a company already in the CRM' : 'duplicate of another row in this file'}.`,
      });
      return;
    }
    if (n) seenNames.add(n);
    if (d) seenDomains.add(d);
    unique.push(row);
  });

  return { unique, duplicates };
}
