import { NextResponse } from 'next/server';
import { AUTH_COOKIE } from '@/middleware';

export const runtime = 'nodejs';

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(AUTH_COOKIE);
  return res;
}
