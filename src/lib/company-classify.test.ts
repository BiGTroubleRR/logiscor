import { describe, expect, it } from 'vitest';
import { isManufacturerOnly } from './company-classify';

describe('isManufacturerOnly', () => {
  it('is false for a plain carrier', () => {
    expect(isManufacturerOnly({ type: 'carrier', types: ['carrier'] })).toBe(false);
  });

  it('is true for a company that only manufactures', () => {
    expect(isManufacturerOnly({ type: 'manufacturer', types: ['manufacturer'] })).toBe(true);
  });

  it('is false when a company is both a carrier and a manufacturer', () => {
    expect(isManufacturerOnly({ type: 'carrier', types: ['carrier', 'manufacturer'] })).toBe(false);
  });

  it('falls back to the legacy single `type` field when `types` is empty', () => {
    expect(isManufacturerOnly({ type: 'manufacturer', types: [] })).toBe(true);
    expect(isManufacturerOnly({ type: 'port', types: [] })).toBe(false);
  });
});
