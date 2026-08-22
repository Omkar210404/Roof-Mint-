import ExcelJS from 'exceljs';
import { CSV_HEADERS, HEADER_LABELS, TEMPLATE_EXAMPLE_ROW } from '@/app/admin/properties/import/template-shape';

// Server-only (exceljs is a Node library) — kept out of template-shape.ts
// since that file is also imported by the client-side review screen.
export async function buildTemplateWorkbookBuffer(): Promise<ArrayBuffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Properties');

  sheet.columns = CSV_HEADERS.map(key => ({
    header: HEADER_LABELS[key],
    key,
    width: Math.max(HEADER_LABELS[key].length, String(TEMPLATE_EXAMPLE_ROW[key] || '').length, 12) + 4,
  }));

  const headerRow = sheet.getRow(1);
  headerRow.height = 22;
  headerRow.eachCell(cell => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D9488' } };
    cell.alignment = { vertical: 'middle', horizontal: 'left' };
  });
  sheet.views = [{ state: 'frozen', ySplit: 1 }];

  const exampleRow = sheet.addRow(TEMPLATE_EXAMPLE_ROW as Record<string, string>);
  exampleRow.eachCell(cell => {
    cell.font = { italic: true, color: { argb: 'FF94A3B8' } };
  });

  return workbook.xlsx.writeBuffer();
}
