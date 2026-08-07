// Starting point for the "Trailer Types" chip picker — companies.trailer_types has no seed
// data at all (unlike capability_tags, which is derived from the source dataset), so this
// preset list is what fills the dropdown before anyone's added anything. Whatever's actually
// in use across companies gets unioned in on top of this (see allTrailerTypes in CrmContext).
export const PRESET_TRAILER_TYPES = [
  'Flatbed',
  'Curtainside',
  'Box / Dry Van',
  'Refrigerated (Reefer)',
  'Tanker',
  'Tipper',
  'Low Loader',
  'Mega Trailer',
  'Swap Body',
  'Container Chassis',
  'Car Carrier',
  'Livestock',
  'Silo',
  'Walking Floor',
];
