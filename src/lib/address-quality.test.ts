import { describe, expect, it } from 'vitest';
import { hasPreciseAddress } from './address-quality';

describe('hasPreciseAddress', () => {
  it('is true when a city is on file', () => {
    expect(hasPreciseAddress({ city: 'Ostrava', region: '', country: 'Czech Republic' })).toBe(true);
  });

  it('is true when only a region is on file', () => {
    expect(hasPreciseAddress({ city: '', region: 'Moravian-Silesian', country: 'Czech Republic' })).toBe(true);
  });

  it('is false when both city and region are blank', () => {
    expect(hasPreciseAddress({ city: '', region: '', country: 'Czech Republic' })).toBe(false);
  });

  it('is false for a non-country placeholder even if city/region are set', () => {
    expect(hasPreciseAddress({ city: 'Somewhere', region: '', country: 'Europe (unspecified)' })).toBe(false);
    expect(hasPreciseAddress({ city: '', region: '', country: 'Unknown' })).toBe(false);
  });
});
