import type { CompanyType } from '@/types/company';

// A company that only manufactures (no carrier role) is kept out of the default company list —
// procurement's day-to-day work is finding carriers, and staff shouldn't be nudged into
// contacting a pure manufacturer by seeing it mixed in with the carriers. The "Manufacturers
// only" filter flips this to show exclusively that group instead.
export function isManufacturerOnly(c: { type: CompanyType; types: CompanyType[] }): boolean {
  const types = c.types.length ? c.types : [c.type];
  return types.includes('manufacturer') && !types.includes('carrier');
}
