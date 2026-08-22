import ExcelJS from 'exceljs';
import {
  CSV_HEADERS, HEADER_LABELS, TEMPLATE_EXAMPLE_ROW,
  PROPERTY_TYPES, LISTING_TYPES, OWNERSHIPS, FURNISHINGS, PRICE_TYPES, STATUSES, DEMAND_TAGS, BHKS,
} from '@/app/admin/properties/import/template-shape';

// How many data rows (below the header) get the dropdown applied — generous
// headroom so pasting/typing further down still gets the picker.
const VALIDATED_ROWS = 300;

// Columns with a fixed, short value set get an in-cell dropdown restricted
// to exactly those values (Excel's inline list formula, comma-separated).
const ENUM_COLUMNS: Partial<Record<(typeof CSV_HEADERS)[number], string[]>> = {
  property_type: PROPERTY_TYPES,
  listing_type: LISTING_TYPES,
  ownership: OWNERSHIPS,
  bhk: BHKS,
  furnishing: FURNISHINGS,
  price_type: PRICE_TYPES,
  status: STATUSES,
  demand_tag: DEMAND_TAGS,
};

// Server-only (exceljs is a Node library) — kept out of template-shape.ts
// since that file is also imported by the client-side review screen.
export async function buildTemplateWorkbookBuffer(agentNames: string[]): Promise<ArrayBuffer> {
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

  // A hidden sheet holding the live agent list — the "Primary Agent" column
  // validates against this range instead of an inline list, since agent
  // names/count change over time and can't be baked into a fixed formula.
  let agentRangeFormula: string | null = null;
  if (agentNames.length > 0) {
    const listSheet = workbook.addWorksheet('Lists', { state: 'veryHidden' });
    listSheet.getCell('A1').value = 'Agents';
    agentNames.forEach((name, i) => { listSheet.getCell(`A${i + 2}`).value = name; });
    agentRangeFormula = `Lists!$A$2:$A$${agentNames.length + 1}`;
  }

  for (let r = 2; r <= VALIDATED_ROWS + 1; r++) {
    for (const [key, values] of Object.entries(ENUM_COLUMNS)) {
      sheet.getCell(`${sheet.getColumn(key).letter}${r}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`"${values!.join(',')}"`],
        showErrorMessage: true,
        error: `Pick one from the dropdown: ${values!.join(', ')}`,
      };
    }
    if (agentRangeFormula) {
      sheet.getCell(`${sheet.getColumn('primary_agent').letter}${r}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [agentRangeFormula],
        showErrorMessage: true,
        error: 'Pick an agent from the dropdown — it must match one already in Agents.',
      };
    }
  }

  return workbook.xlsx.writeBuffer();
}
