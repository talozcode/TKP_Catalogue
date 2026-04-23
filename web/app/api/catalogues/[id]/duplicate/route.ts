import { duplicateCatalogue } from '@/lib/catalogue-server';
import { fail, ok } from '@/lib/route-helpers';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Ctx = { params: { id: string } };

export async function POST(req: Request, { params }: Ctx) {
  try {
    let newName: string | undefined;
    try {
      const body = await req.json();
      if (body && typeof body.newName === 'string') newName = body.newName;
    } catch {
      // No body is fine — duplicate with default name.
    }
    return ok(await duplicateCatalogue(params.id, newName));
  } catch (e) {
    return fail(e);
  }
}
