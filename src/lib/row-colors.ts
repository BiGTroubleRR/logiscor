// Preset highlight colors for marking a company row in the list — see the "Color" column
// in CompanyTable.tsx. Stored on companies.label_color as the hex value directly (or ''
// for no color), so no lookup table is needed to persist a selection — only to render one.
export const ROW_COLORS = [
  { name: 'Red', hex: '#ef4444' },
  { name: 'Orange', hex: '#f97316' },
  { name: 'Amber', hex: '#f59e0b' },
  { name: 'Yellow', hex: '#eab308' },
  { name: 'Green', hex: '#22c55e' },
  { name: 'Teal', hex: '#14b8a6' },
  { name: 'Cyan', hex: '#06b6d4' },
  { name: 'Blue', hex: '#3b82f6' },
  { name: 'Indigo', hex: '#6366f1' },
  { name: 'Purple', hex: '#a855f7' },
  { name: 'Pink', hex: '#ec4899' },
  { name: 'Gray', hex: '#6b7280' },
];

export function rowColorName(hex: string): string {
  return ROW_COLORS.find((c) => c.hex === hex)?.name ?? '';
}
