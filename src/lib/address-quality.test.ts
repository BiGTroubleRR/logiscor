import { describe, expect, it } from 'vitest';
import { hasPreciseAddress } from './address-quality';

describe('hasPreciseAddress', () => {
  it('is true when a city is on file', () => {
    expect(hasPreciseAddress({ city: 'Ostrava', country: 'Czech Republic' })).toBe(true);
  });

  it('is false when city is blank', () => {
    expect(hasPreciseAddress({ city: '', country: 'Czech Republic' })).toBe(false);
  });

  it('is false for a non-country placeholder even if city is set', () => {
    expect(hasPreciseAddress({ city: 'Somewhere', country: 'Europe (unspecified)' })).toBe(false);
    expect(hasPreciseAddress({ city: '', country: 'Unknown' })).toBe(false);
  });
});
