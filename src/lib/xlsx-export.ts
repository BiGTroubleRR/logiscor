// Client-only: builds and downloads an .xlsx sibling to companiesToCsv/downloadCsv in csv.ts,
// sharing that file's COLUMNS as the single source of truth for both export formats.
//
// exceljs is dynamic-imported (not a top-level import), same as company-import-template.ts —
// it lands in its own chunk instead of FilterBar's eagerly-loaded bundle.
import type { Company } from '@/types/company';
import { COLUMNS } from './csv';

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
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `carriers-export-${new Date().toISOString().slice(0, 10)}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
