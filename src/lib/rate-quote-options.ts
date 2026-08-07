// Preset option lists for the Rates Received form (CompanyDrawer.tsx). The form is
// progressive: Transport Mode gates which equipment fields apply, and cargo type gates
// whether a hazmat class is asked for — see the visibility rules built around these lists
// in CompanyDrawer.tsx rather than encoded here.

export const TRANSPORT_MODES = ['Air Freight', 'Ocean Freight', 'Road Freight', 'Rail / Multimodal'];

// Ocean / intermodal equipment.
export const LOAD_TYPES = ['FCL (Full Container Load)', 'LCL (Less than Container Load)'];
export const CONTAINER_TYPES = ['Dry', 'Reefer', 'Open Top', 'Flat Rack'];

// Road equipment.
export const ROAD_VEHICLE_TYPES = [
  'Tautliner (Curtainsider)',
  'Box Truck',
  'Mega Trailer',
  'Mulda (Coil Well)',
  'Reefer',
  'Flatbed / Lowboy',
];
export const ROAD_CAPACITIES = ['3.5T', '7.5T', '12T', '24T (Standard Mega)'];
export const ROAD_SERVICE_TYPES = ['FTL (Full Truckload)', 'LTL / Groupage (Less than Truckload)', 'Express'];

// Cargo type & handling requirements — applies across modes.
export const SPECIAL_CARGO_TYPES = ['ADR / Hazmat', 'Temperature Controlled', 'High Value / High Risk (TAPA)'];
export const GENERAL_CARGO_TYPES = ['FMCG', 'Packaging Materials', 'Automotive Parts', 'Industrial Machinery'];

// Only asked when Cargo Type is "ADR / Hazmat".
export const HAZMAT_CLASSES = [
  'Class 1 (Explosives)',
  'Class 2 (Gases)',
  'Class 3 (Flammable Liquids)',
  'Class 4 (Flammable Solids)',
  'Class 5 (Oxidizing Substances)',
  'Class 6 (Toxic / Infectious Substances)',
  'Class 7 (Radioactive Material)',
  'Class 8 (Corrosive Substances)',
  'Class 9 (Miscellaneous)',
];

export const DELIVERY_SCOPES = ['Door-to-Door', 'Port-to-Port', 'Cross-docking', 'Last-mile Delivery'];
