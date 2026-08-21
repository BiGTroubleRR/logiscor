// Client-only: builds and downloads an .xlsx sibling to companiesToCsv/downloadCsv in csv.ts,
// sharing that file's COLUMNS as the single source of truth for both export formats.
//
// exceljs is dynamic-imported (not a top-level import), same as company-import-template.ts —
// it lands in its own chunk instead of FilterBar's eagerly-loaded bundle.
import type { Company } from '@/types/company';
import type { Project, ProjectCompanyLink } from '@/types/project';
import { COLUMNS } from './csv';

// Slate/blue palette already used throughout the app's own UI (see styles.ts, and the
// project drawer's green "LOWEST" badge) — reused here so the export looks like it belongs
// to the same product rather than a generic spreadsheet dump.
const HEADER_FILL = 'FF0F172A';
const HEADER_FONT = 'FFFFFFFF';
const TITLE_FILL = 'FFF1F5F9';
const TITLE_FONT = 'FF0F172A';
const SUBTITLE_FONT = 'FF64748B';
const BAND_FILL = 'FFF8FAFC';
const BORDER_COLOR = 'FFE2E8F0';
const LOWEST_FILL = 'FFDCFCE7';
const LOWEST_FONT = 'FF166534';

const thinBorder = { style: 'thin' as const, color: { argb: BORDER_COLOR } };
const allBorders = { top: thinBorder, left: thinBorder, bottom: thinBorder, right: thinBorder };

// Shared by every export below — builds the .xlsx buffer into a temporary <a download> click,
// same pattern csv.ts's downloadCsv uses.
function triggerXlsxDownload(buffer: ArrayBuffer, filenamePrefix: string): void {
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filenamePrefix}-${new Date().toISOString().slice(0, 10)}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function downloadCompaniesXlsx(companies: Company[]): Promise<void> {
  const ExcelJS = (await import('exceljs')).default;
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Companies');

  sheet.addRow([...COLUMNS]);
  sheet.getRow(1).font = { bold: true };
  sheet.columns = COLUMNS.map((h) => ({ width: Math.max(14, h.length + 4) }));

  companies.forEach((c) => {
    sheet.addRow(
      COLUMNS.map((key) => {
        if (key === 'capability_tags') return c.capability_tags.join('; ');
        if (key === 'trailer_types') return c.trailer_types.join('; ');
        return c[key];
      }),
    );
  });

  const buffer = await workbook.xlsx.writeBuffer();
  triggerXlsxDownload(buffer, 'carriers-export');
}

// A styled export of one project's partners — deliberately not a bare data dump: a merged
// title band with the project name/route, a dark header row, zebra-striped data rows, and the
// cheapest quote highlighted the same green as the "LOWEST" badge in the project drawer, so the
// sheet reads as an extension of the app rather than a generic table.
export async function downloadProjectPartnersXlsx(
  project: Project,
  rows: { company: Company; link: ProjectCompanyLink | undefined }[],
): Promise<void> {
  const ExcelJS = (await import('exceljs')).default;
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Partners');

  const headers = ['Company', 'Type', 'Country', 'City', 'Quoted Rate (€)', 'Remarks', 'Email', 'Phone', 'Website'];
  const colCount = headers.length;

  sheet.mergeCells(1, 1, 1, colCount);
  const titleCell = sheet.getCell(1, 1);
  titleCell.value = project.name;
  titleCell.font = { bold: true, size: 16, color: { argb: TITLE_FONT } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TITLE_FILL } };
  titleCell.alignment = { vertical: 'middle' };
  sheet.getRow(1).height = 26;

  if (project.description.trim()) {
    sheet.mergeCells(2, 1, 2, colCount);
    const subCell = sheet.getCell(2, 1);
    subCell.value = project.description.trim();
    subCell.font = { italic: true, size: 10, color: { argb: SUBTITLE_FONT } };
    subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TITLE_FILL } };
    subCell.alignment = { wrapText: true, vertical: 'middle' };
    sheet.getRow(2).height = 30;
  }

  const headerRowIdx = project.description.trim() ? 4 : 3;
  const headerRow = sheet.getRow(headerRowIdx);
  headerRow.values = headers;
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: HEADER_FONT } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = allBorders;
  });
  headerRow.height = 20;

  const sortedRows = [...rows].sort((a, b) => {
    const ra = a.link?.quoted_rate ?? null;
    const rb = b.link?.quoted_rate ?? null;
    if (ra == null && rb == null) return 0;
    if (ra == null) return 1;
    if (rb == null) return -1;
    return ra - rb;
  });
  const lowestRate = sortedRows.find((r) => r.link?.quoted_rate != null)?.link?.quoted_rate ?? null;

  sortedRows.forEach(({ company: c, link }, i) => {
    const rowIdx = headerRowIdx + 1 + i;
    const row = sheet.getRow(rowIdx);
    row.values = [
      c.name,
      c.type,
      c.country,
      c.city,
      link?.quoted_rate ?? null,
      link?.remarks ?? '',
      c.email,
      c.phone,
      c.website,
    ];
    const isLowest = lowestRate != null && link?.quoted_rate === lowestRate;
    row.eachCell((cell, colNumber) => {
      cell.border = allBorders;
      cell.alignment = { vertical: 'top', wrapText: colNumber === 6 };
      if (isLowest) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LOWEST_FILL } };
        cell.font = { color: { argb: LOWEST_FONT }, bold: colNumber === 1 || colNumber === 5 };
      } else if (i % 2 === 1) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BAND_FILL } };
      }
    });
    const rateCell = row.getCell(5);
    rateCell.numFmt = '€#,##0';
    rateCell.alignment = { vertical: 'top', horizontal: 'right' };
  });

  sheet.columns = [
    { width: 22 }, // Company
    { width: 14 }, // Type
    { width: 16 }, // Country
    { width: 20 }, // City
    { width: 16 }, // Quoted Rate
    { width: 42 }, // Remarks
    { width: 24 }, // Email
    { width: 16 }, // Phone
    { width: 24 }, // Website
  ];

  sheet.views = [{ state: 'frozen', ySplit: headerRowIdx }];
  sheet.autoFilter = { from: { row: headerRowIdx, column: 1 }, to: { row: headerRowIdx, column: colCount } };

  const buffer = await workbook.xlsx.writeBuffer();
  const slug = project.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'project';
  triggerXlsxDownload(buffer, `${slug}-partners`);
}
