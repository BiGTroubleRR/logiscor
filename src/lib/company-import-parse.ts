// Client-only: turns an uploaded .xlsx File into header-keyed row objects for
// validateImportRows() in company-import.ts. Only .xlsx is accepted — one parsing path,
// through the same library used to generate the template, keeps this predictable.
//
// exceljs is dynamic-imported (not a top-level import) so it lands in its own chunk instead of
// the default list view's bundle — it's only ever touched from the Import button.

export async function parseImportWorkbook(file: File): Promise<Record<string, unknown>[]> {
  const ExcelJS = (await import('exceljs')).default;
  const buffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const sheet = workbook.worksheets[0];
  if (!sheet) return [];

  const headerRow = sheet.getRow(1);
  const headers: string[] = [];
  headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    headers[colNumber] = String(cell.value ?? '').trim().toLowerCase();
  });

  const rows: Record<string, unknown>[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;

    const record: Record<string, unknown> = {};
    let hasValue = false;
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const header = headers[colNumber];
      if (!header) return;
      const value = cell.value != null && typeof cell.value === 'object' && 'text' in cell.value ? (cell.value as { text: unknown }).text : cell.value;
      if (value != null && value !== '') hasValue = true;
      record[header] = value;
    });
    if (hasValue) rows.push(record);
  });

  return rows;
}
