// Shared between the template generator and the import preview/validation flow. Column order
// here is the contract for both — the downloaded template and the parser must agree on it.
import type { CompanyType } from '@/types/company';
import { normalizeCompanyName, normalizeDomain } from './duplicates';
import { en } from './i18n/en';
import { cs } from './i18n/cs';
import type { Locale } from '@/lib/i18n/locale';

const DICTS = { en, cs };

export const IMPORT_HEADERS = [
  'name',
  'type',
  'country',
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

// Column keys (row 1 of the "Companies" sheet) stay in English regardless of locale — they're
// a parsing contract with parseImportWorkbook, not display text. Only the "Read me" sheet's
// notes and its own headers vary by locale.
const IMPORT_COLUMN_NOTES_CS: Record<ImportHeader, string> = {
  name: 'Povinné.',
  type: 'carrier, manufacturer, port nebo warehouse. Prázdné výchozí na carrier.',
  country: '',
  city: '',
  lat: 'Povinné. Desetinné stupně, např. 48.137.',
  lng: 'Povinné. Desetinné stupně, např. 11.575.',
  website: '',
  phone: '',
  email: '',
  description: '',
  capability_tags: 'Oddělené středníkem, např. "Road Freight; Customs".',
  trailer_types: 'Oddělené středníkem, např. "Flatbed; Curtainside".',
  pending_review: 'true/false. Prázdné výchozí na true.',
};

export function getImportColumnNotes(locale: Locale): Record<ImportHeader, string> {
  return locale === 'cs' ? IMPORT_COLUMN_NOTES_CS : IMPORT_COLUMN_NOTES;
}

export function getReadMeHeaders(locale: Locale): [string, string] {
  return locale === 'cs' ? ['Sloupec', 'Poznámky'] : ['Column', 'Notes'];
}

const VALID_TYPES: CompanyType[] = ['carrier', 'manufacturer', 'port', 'warehouse'];

export type ImportedCompanyRow = {
  name: string;
  type: CompanyType;
  country: string;
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
export function validateImportRow(raw: Record<string, unknown>, rowNumber: number, locale: Locale = 'en'): ImportedCompanyRow | ImportRowError {
  const v = DICTS[locale].importValidation;
  const name = String(raw.name ?? '').trim();
  if (!name) return { row: rowNumber, reason: v.nameRequired };

  const rawType = String(raw.type ?? '').trim().toLowerCase();
  const type = (rawType || 'carrier') as CompanyType;
  if (rawType && !VALID_TYPES.includes(type)) {
    return { row: rowNumber, reason: v.invalidType(String(raw.type), VALID_TYPES.join(', ')) };
  }

  const lat = Number(raw.lat);
  const lng = Number(raw.lng);
  if (raw.lat == null || raw.lat === '' || Number.isNaN(lat) || lat < -90 || lat > 90) {
    return { row: rowNumber, reason: v.latRequired };
  }
  if (raw.lng == null || raw.lng === '' || Number.isNaN(lng) || lng < -180 || lng > 180) {
    return { row: rowNumber, reason: v.lngRequired };
  }

  return {
    name,
    type,
    country: String(raw.country ?? '').trim(),
    city: String(raw.city ?? '').trim(),
    lat,
    lng,
    website: String(raw.website ?? '').trim(),
    phone: String(raw.phone ?? '').trim(),
    email: String(raw.email ?? '').trim(),
    // "Remarks" is accepted as an alias for externally-authored sheets that don't use the
    // app's own canonical "description" column header (see IMPORT_HEADERS above, which still
    // only ever offers "description" in the generated template).
    description: String(raw.description ?? raw.remarks ?? '').trim(),
    capability_tags: splitList(raw.capability_tags),
    trailer_types: splitList(raw.trailer_types),
    pending_review: parseBoolean(raw.pending_review, true),
  };
}

export function validateImportRows(rows: Record<string, unknown>[], locale: Locale = 'en'): ImportValidationResult {
  const valid: ImportedCompanyRow[] = [];
  const errors: ImportRowError[] = [];
  rows.forEach((raw, i) => {
    const result = validateImportRow(raw, i + 2, locale); // +2: header row is 1, data starts at 2
    if ('reason' in result) errors.push(result);
    else valid.push(result);
  });
  return { valid, errors };
}

// Keeps the row data (not just a message) so a flagged duplicate can still be imported if
// staff choose to — see ImportCompaniesButton.tsx's per-row "Import anyway" checkboxes.
export type ImportDuplicateEntry = { row: ImportedCompanyRow; reason: string };
export type ImportDuplicatePartition = { unique: ImportedCompanyRow[]; duplicates: ImportDuplicateEntry[] };

// Cross-checks import rows against companies already in the CRM (by normalized name or website
// domain — same heuristic the "Possible duplicates" table flag uses, see duplicates.ts) and
// against earlier rows in the same file. Matches are excluded from `unique` by default — staff
// review them and opt individual rows back in (e.g. several hubs of the same company sharing a
// domain) rather than ending up with silent double entries.
export function partitionDuplicateRows(
  rows: ImportedCompanyRow[],
  existing: { name: string; website: string }[],
  locale: Locale = 'en',
): ImportDuplicatePartition {
  const v = DICTS[locale].importValidation;
  const existingNames = new Set(existing.map((c) => normalizeCompanyName(c.name)).filter(Boolean));
  const existingDomains = new Set(existing.map((c) => normalizeDomain(c.website)).filter(Boolean));
  const seenNames = new Set<string>();
  const seenDomains = new Set<string>();

  const unique: ImportedCompanyRow[] = [];
  const duplicates: ImportDuplicateEntry[] = [];

  rows.forEach((row) => {
    const n = normalizeCompanyName(row.name);
    const d = normalizeDomain(row.website);
    const matchesExisting = (!!n && existingNames.has(n)) || (!!d && existingDomains.has(d));
    const matchesEarlierRow = (!!n && seenNames.has(n)) || (!!d && seenDomains.has(d));

    if (matchesExisting || matchesEarlierRow) {
      duplicates.push({
        row,
        reason: v.duplicateSkip(row.name, matchesExisting ? v.matchesExisting : v.duplicateInFile),
      });
      return;
    }
    if (n) seenNames.add(n);
    if (d) seenDomains.add(d);
    unique.push(row);
  });

  return { unique, duplicates };
}
