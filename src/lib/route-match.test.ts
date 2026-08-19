import { describe, expect, it } from 'vitest';
import { matchRouteQuoteTier, quoteMatchesRoute } from './route-match';

describe('quoteMatchesRoute', () => {
  it('matches when the quote text contains the searched place', () => {
    expect(quoteMatchesRoute({ origin: 'Prague, Czechia', destination: 'Munich, Germany' }, 'Prague', 'Munich')).toBe(true);
  });

  it('matches when the searched place contains the quote text', () => {
    expect(quoteMatchesRoute({ origin: 'Fót', destination: 'İzmit' }, 'Fót, Hungary', 'İzmit/Kocaeli, Turkey')).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(quoteMatchesRoute({ origin: 'PRAGUE', destination: 'munich' }, 'prague', 'MUNICH')).toBe(true);
  });

  it('requires both origin and destination to match', () => {
    expect(quoteMatchesRoute({ origin: 'Prague', destination: 'Berlin' }, 'Prague', 'Munich')).toBe(false);
  });

  it('does not match blank quote or search text against anything', () => {
    expect(quoteMatchesRoute({ origin: '', destination: '' }, 'Prague', 'Munich')).toBe(false);
    expect(quoteMatchesRoute({ origin: 'Prague', destination: 'Munich' }, '', '')).toBe(false);
  });
});

describe('matchRouteQuoteTier', () => {
  it('returns "exact" when the quote matches the searched place directly', () => {
    expect(matchRouteQuoteTier({ origin: 'Prague, Czechia', destination: 'Munich, Germany' }, 'Prague', 'Munich')).toBe('exact');
  });

  it('returns "same_country" for a different city in the same country on both ends', () => {
    expect(matchRouteQuoteTier({ origin: 'Brno, Czechia', destination: 'Nuremberg, Germany' }, 'Prague, Czechia', 'Munich, Germany')).toBe(
      'same_country',
    );
  });

  it('returns null when only one end shares a country', () => {
    expect(matchRouteQuoteTier({ origin: 'Brno, Czechia', destination: 'Paris, France' }, 'Prague, Czechia', 'Munich, Germany')).toBeNull();
  });

  it('returns null when the search text has no country to compare', () => {
    expect(matchRouteQuoteTier({ origin: 'Brno, Czechia', destination: 'Nuremberg, Germany' }, 'Prague', 'Munich')).toBeNull();
  });

  it('returns null when neither the place nor the country match', () => {
    expect(matchRouteQuoteTier({ origin: 'Brno, Czechia', destination: 'Nuremberg, Germany' }, 'Warsaw, Poland', 'Lyon, France')).toBeNull();
  });
});
