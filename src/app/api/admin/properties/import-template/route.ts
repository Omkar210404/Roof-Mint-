import { NextResponse } from 'next/server';
import { requireAdmin } from '@/utils/supabase/admin-guard';
import { buildTemplateWorkbookBuffer } from './build-workbook';

// Generates the bulk-import template as a real .xlsx file (not .csv) so the
// header row can actually be bold/highlighted and the columns pre-sized —
// plain CSV has no cell formatting at all, so this is the only way to hand
// back a template that doesn't need manual reformatting before use.
export async function GET() {
  const { authorized, supabase } = await requireAdmin();
  if (!authorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: agents } = await supabase.from('agents').select('name').order('name');
  const buffer = await buildTemplateWorkbookBuffer((agents || []).map(a => a.name));

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="roofmint-properties-template.xlsx"',
    },
  });
}
