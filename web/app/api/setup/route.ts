import { runSetup } from '@/lib/catalogue-server';
import { fail, ok } from '@/lib/route-helpers';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST() {
  try {
    return ok(await runSetup());
  } catch (e) {
    return fail(e);
  }
}
