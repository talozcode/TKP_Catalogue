import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { AUTH_COOKIE } from '@/middleware';

export const runtime = 'nodejs';

const THIRTY_DAYS_S = 60 * 60 * 24 * 30;

export async function POST(req: NextRequest) {
  const { password } = (await req.json()) as { password?: string };
  const appPassword = process.env.APP_PASSWORD;

  if (!appPassword || !password || password !== appPassword) {
    return NextResponse.json({ error: 'Incorrect password' }, { status: 401 });
  }

  const token = createHash('sha256').update(appPassword).digest('hex');
  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: THIRTY_DAYS_S,
    path: '/',
    sameSite: 'lax'
  });
  return res;
}
