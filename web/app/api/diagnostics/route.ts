import { SHEETS, readAllWithHeaders } from '@/lib/sheets';
import { fail, ok } from '@/lib/route-helpers';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const { headers, rows } = await readAllWithHeaders(SHEETS.PRODUCTS);
    const sample = rows[0] || null;
    return ok({
      sheet: SHEETS.PRODUCTS,
      headers,
      headerCount: headers.length,
      rowCount: rows.length,
      sampleByHeader: sample
        ? Object.fromEntries(
            Object.entries(sample).filter(([k]) => k !== '__cells')
          )
        : null,
      sampleByColumn: sample?.__cells || null
    });
  } catch (e) {
    return fail(e);
  }
}
