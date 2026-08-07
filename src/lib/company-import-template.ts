// Client-only: builds and downloads the .xlsx template staff fill in for bulk import. Kept
// separate from company-import.ts (parsing/validation) since this side never runs against
// untrusted input — it only ever writes a file this app generated itself.
import ExcelJS from 'exceljs';
import { IMPORT_HEADERS, IMPORT_COLUMN_NOTES } from './company-import';

export async function downloadImportTemplate(): Promise<void> {
  const workbook = new ExcelJS.Workbook();

  const sheet = workbook.addWorksheet('Companies');
  sheet.addRow([...IMPORT_HEADERS]);
  sheet.getRow(1).font = { bold: true };
  sheet.columns = IMPORT_HEADERS.map((h) => ({ width: Math.max(14, h.length + 4) }));

  const notes = workbook.addWorksheet('Read me');
  notes.addRow(['Column', 'Notes']);
  notes.getRow(1).font = { bold: true };
  IMPORT_HEADERS.forEach((h) => notes.addRow([h, IMPORT_COLUMN_NOTES[h] || '']));
  notes.columns = [{ width: 18 }, { width: 60 }];

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'carrier-crm-import-template.xlsx';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
