import { getProducts } from '@/lib/catalogue-server';
import { fail, ok } from '@/lib/route-helpers';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    return ok(await getProducts());
  } catch (e) {
    return fail(e);
  }
}
