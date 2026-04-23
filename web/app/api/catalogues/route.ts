import { listCatalogues, saveCatalogue } from '@/lib/catalogue-server';
import { fail, ok } from '@/lib/route-helpers';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    return ok(await listCatalogues());
  } catch (e) {
    return fail(e);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    return ok(await saveCatalogue(body));
  } catch (e) {
    return fail(e);
  }
}
