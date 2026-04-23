import { deleteCatalogue, loadCatalogue } from '@/lib/catalogue-server';
import { fail, ok } from '@/lib/route-helpers';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Ctx = { params: { id: string } };

export async function GET(_req: Request, { params }: Ctx) {
  try {
    return ok(await loadCatalogue(params.id));
  } catch (e) {
    return fail(e);
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    return ok(await deleteCatalogue(params.id));
  } catch (e) {
    return fail(e);
  }
}
