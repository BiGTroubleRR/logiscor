import { describe, expect, it } from 'vitest';
import { appendHubNote, buildMergedCompanyPatch, computeDuplicateFlags, hubNoteText, normalizeCompanyName, normalizeDomain } from './duplicates';

describe('normalizeCompanyName', () => {
  it('lowercases and strips legal-suffix words', () => {
    // "s.r.o." splits into three single-letter tokens once punctuation is turned to spaces
    // (before the legal-suffix regex runs), so each survives as its own token — this locks in
    // that actual behavior rather than the ideal of stripping "s.r.o." as one unit.
    expect(normalizeCompanyName('Acme Logistics s.r.o.')).toBe('acme s r o');
  });

  it('strips diacritics before matching legal-suffix words', () => {
    expect(normalizeCompanyName('Škoda Transport a.s.')).toBe('skoda a s');
  });

  it('collapses punctuation and repeated whitespace', () => {
    expect(normalizeCompanyName('Foo, Bar & Baz  -  Co.')).toBe('foo bar baz co');
  });

  it('returns an empty string for a blank name', () => {
    expect(normalizeCompanyName('')).toBe('');
  });
});

describe('normalizeDomain', () => {
  it('strips scheme, www, path, and query', () => {
    expect(normalizeDomain('https://www.example.com/path?x=1')).toBe('example.com');
    expect(normalizeDomain('http://example.com')).toBe('example.com');
  });

  it('returns an empty string for null/undefined/blank input', () => {
    expect(normalizeDomain(null)).toBe('');
    expect(normalizeDomain(undefined)).toBe('');
    expect(normalizeDomain('')).toBe('');
  });
});

describe('hubNoteText / appendHubNote', () => {
  it('formats the hub note with the original name and number', () => {
    expect(hubNoteText('Acme Freight', 2)).toBe('Hub duplicate 2 of "Acme Freight".');
  });

  it('appends the note as a new paragraph when a description already exists', () => {
    expect(appendHubNote('Existing text.', 'Note.')).toBe('Existing text.\n\nNote.');
  });

  it('uses the note as-is when the description is blank', () => {
    expect(appendHubNote('', 'Note.')).toBe('Note.');
    expect(appendHubNote('   ', 'Note.')).toBe('Note.');
  });
});

describe('computeDuplicateFlags', () => {
  type TestCompany = { id: string; name: string; website: string; duplicate_dismissed: boolean };

  it('flags companies that share a normalized domain, even with different names', () => {
    const companies: TestCompany[] = [
      { id: '1', name: 'Acme Freight', website: 'https://acme.com', duplicate_dismissed: false },
      { id: '2', name: 'Acme Freight Hub 2', website: 'https://www.acme.com/contact', duplicate_dismissed: false },
      { id: '3', name: 'Totally Different Co', website: 'https://different.com', duplicate_dismissed: false },
    ];
    const result = computeDuplicateFlags(companies);
    const byId = new Map(result.map((c) => [c.id, c]));

    expect(byId.get('1')!.hasDuplicateMatch).toBe(true);
    expect(byId.get('1')!.isDuplicate).toBe(true);
    expect(byId.get('1')!.duplicateMatches.map((m) => m.id)).toEqual(['2']);
    expect(byId.get('2')!.duplicateMatches.map((m) => m.id)).toEqual(['1']);
    expect(byId.get('3')!.hasDuplicateMatch).toBe(false);
    expect(byId.get('3')!.isDuplicate).toBe(false);
  });

  it('flags companies that share a normalized name, even with different domains', () => {
    const companies: TestCompany[] = [
      { id: '1', name: 'Prime Cargo', website: 'https://one.example', duplicate_dismissed: false },
      { id: '2', name: 'PRIME   CARGO', website: 'https://two.example', duplicate_dismissed: false },
    ];
    const result = computeDuplicateFlags(companies);
    expect(result.find((c) => c.id === '1')!.isDuplicate).toBe(true);
    expect(result.find((c) => c.id === '2')!.isDuplicate).toBe(true);
  });

  it('keeps hasDuplicateMatch true but isDuplicate false once dismissed', () => {
    const companies: TestCompany[] = [
      { id: '1', name: 'Acme', website: 'https://acme.com', duplicate_dismissed: true },
      { id: '2', name: 'Acme', website: 'https://acme.com', duplicate_dismissed: false },
    ];
    const result = computeDuplicateFlags(companies);
    const dismissed = result.find((c) => c.id === '1')!;
    expect(dismissed.hasDuplicateMatch).toBe(true);
    expect(dismissed.isDuplicate).toBe(false);
  });

  it('does not match companies with blank name and website against each other', () => {
    const companies: TestCompany[] = [
      { id: 'a', name: '', website: '', duplicate_dismissed: false },
      { id: 'b', name: '', website: '', duplicate_dismissed: false },
    ];
    const result = computeDuplicateFlags(companies);
    expect(result.every((c) => !c.hasDuplicateMatch)).toBe(true);
  });
});

describe('buildMergedCompanyPatch', () => {
  type TestCompany = {
    id: string;
    name: string;
    types: string[];
    country: string;
    city: string;
    website: string;
    email: string;
    phone: string;
    description: string;
    capability_tags: string[];
    trailer_types: string[];
    countries_served: string[];
  };
  const base: TestCompany = {
    id: '1',
    name: 'Acme Freight',
    types: ['carrier'],
    country: '',
    city: '',
    website: '',
    email: '',
    phone: '',
    description: '',
    capability_tags: [],
    trailer_types: [],
    countries_served: [],
  };

  it('fills blank survivor fields from the loser without overwriting non-blank ones', () => {
    const survivor: TestCompany = { ...base, phone: '+420 111', city: 'Prague' };
    const loser: TestCompany = { ...base, id: '2', name: 'Acme Freight s.r.o.', city: 'Brno', email: 'x@acme.example' };
    const patch = buildMergedCompanyPatch(survivor, loser);
    expect(patch.city).toBe('Prague');
    expect(patch.email).toBe('x@acme.example');
  });

  it('unions array fields instead of replacing them', () => {
    const survivor: TestCompany = { ...base, capability_tags: ['Road Freight'], countries_served: ['CZ'] };
    const loser: TestCompany = { ...base, id: '2', capability_tags: ['Customs'], countries_served: ['CZ', 'SK'], types: ['manufacturer'] };
    const patch = buildMergedCompanyPatch(survivor, loser);
    expect(patch.capability_tags).toEqual(['Road Freight', 'Customs']);
    expect(patch.countries_served).toEqual(['CZ', 'SK']);
    expect(patch.types).toEqual(['carrier', 'manufacturer']);
  });

  it('folds the loser description into a merge note instead of dropping it', () => {
    const survivor: TestCompany = { ...base, description: 'Reliable partner.' };
    const loser: TestCompany = { ...base, id: '2', name: 'Acme Freight s.r.o.', description: 'Slow on customs paperwork.' };
    const patch = buildMergedCompanyPatch(survivor, loser);
    expect(patch.description).toBe('Reliable partner.\n\nMerged with "Acme Freight s.r.o.". Their notes: Slow on customs paperwork.');
  });

  it('uses just the merge note when the survivor had no description', () => {
    const loser: TestCompany = { ...base, id: '2', name: 'Acme Freight s.r.o.', description: '' };
    const patch = buildMergedCompanyPatch(base, loser);
    expect(patch.description).toBe('Merged with "Acme Freight s.r.o.".');
  });
});
