import { describe, expect, it } from 'vitest';
import { partitionDuplicateRows, validateImportRow, validateImportRows, type ImportedCompanyRow } from './company-import';

function baseRow(overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
  return { name: 'Acme Freight', lat: 50.1, lng: 14.4, ...overrides };
}

describe('validateImportRow', () => {
  it('accepts a minimal valid row and defaults type/pending_review', () => {
    const result = validateImportRow(baseRow(), 2);
    expect('reason' in result).toBe(false);
    const row = result as ImportedCompanyRow;
    expect(row.name).toBe('Acme Freight');
    expect(row.type).toBe('carrier');
    expect(row.pending_review).toBe(true);
  });

  it('rejects a row with no name', () => {
    const result = validateImportRow(baseRow({ name: '  ' }), 5);
    expect('reason' in result).toBe(true);
    expect((result as { row: number }).row).toBe(5);
  });

  it('rejects an invalid type', () => {
    const result = validateImportRow(baseRow({ type: 'spaceship' }), 3);
    expect('reason' in result).toBe(true);
  });

  it('accepts a valid non-default type, case-insensitively', () => {
    const result = validateImportRow(baseRow({ type: 'Warehouse' }), 2) as ImportedCompanyRow;
    expect(result.type).toBe('warehouse');
  });

  it('rejects missing or out-of-range latitude/longitude', () => {
    expect('reason' in validateImportRow(baseRow({ lat: '' }), 2)).toBe(true);
    expect('reason' in validateImportRow(baseRow({ lat: 91 }), 2)).toBe(true);
    expect('reason' in validateImportRow(baseRow({ lng: -181 }), 2)).toBe(true);
    expect('reason' in validateImportRow(baseRow({ lat: 'not a number' }), 2)).toBe(true);
  });

  it('splits semicolon- and comma-separated list fields and trims entries', () => {
    const result = validateImportRow(baseRow({ capability_tags: 'Road Freight; Customs, ADR' }), 2) as ImportedCompanyRow;
    expect(result.capability_tags).toEqual(['Road Freight', 'Customs', 'ADR']);
  });

  it('parses pending_review from common truthy/falsy strings', () => {
    expect((validateImportRow(baseRow({ pending_review: 'false' }), 2) as ImportedCompanyRow).pending_review).toBe(false);
    expect((validateImportRow(baseRow({ pending_review: 'yes' }), 2) as ImportedCompanyRow).pending_review).toBe(true);
    expect((validateImportRow(baseRow({ pending_review: '' }), 2) as ImportedCompanyRow).pending_review).toBe(true);
  });

  it('falls back to "remarks" for description when "description" is absent', () => {
    const result = validateImportRow(baseRow({ remarks: 'From an external sheet.' }), 2) as ImportedCompanyRow;
    expect(result.description).toBe('From an external sheet.');
  });

  it('prefers "description" over "remarks" when both are present', () => {
    const result = validateImportRow(baseRow({ description: 'Canonical.', remarks: 'Alias.' }), 2) as ImportedCompanyRow;
    expect(result.description).toBe('Canonical.');
  });
});

describe('validateImportRows', () => {
  it('partitions valid rows from errors and offsets row numbers by the header row', () => {
    const { valid, errors } = validateImportRows([baseRow(), baseRow({ name: '' })]);
    expect(valid).toHaveLength(1);
    expect(errors).toHaveLength(1);
    expect(errors[0].row).toBe(3);
  });
});

describe('partitionDuplicateRows', () => {
  const row = (name: string, website = ''): ImportedCompanyRow => ({
    name,
    type: 'carrier',
    country: '',
    city: '',
    lat: 0,
    lng: 0,
    website,
    phone: '',
    email: '',
    description: '',
    capability_tags: [],
    trailer_types: [],
    pending_review: true,
  });

  it('flags a row matching an existing company by normalized name', () => {
    const { unique, duplicates } = partitionDuplicateRows([row('Acme')], [{ name: 'ACME', website: '' }]);
    expect(unique).toHaveLength(0);
    expect(duplicates).toHaveLength(1);
  });

  it('flags a row matching an existing company by normalized website domain', () => {
    const { unique, duplicates } = partitionDuplicateRows(
      [row('Totally Different Name', 'https://www.acme.com')],
      [{ name: 'Acme', website: 'https://acme.com/contact' }],
    );
    expect(unique).toHaveLength(0);
    expect(duplicates).toHaveLength(1);
  });

  it('flags the second occurrence of a repeated row within the same file, keeps the first', () => {
    const { unique, duplicates } = partitionDuplicateRows([row('Acme'), row('Acme')], []);
    expect(unique).toHaveLength(1);
    expect(duplicates).toHaveLength(1);
  });

  it('keeps rows unique when neither name nor domain matches anything', () => {
    const { unique, duplicates } = partitionDuplicateRows([row('Brand New Co', 'https://brandnew.example')], [{ name: 'Acme', website: 'https://acme.com' }]);
    expect(unique).toHaveLength(1);
    expect(duplicates).toHaveLength(0);
  });
});
