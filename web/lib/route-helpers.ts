import { NextResponse } from 'next/server';

export function ok<T>(data: T) {
  return NextResponse.json({ ok: true, data });
}

export function fail(error: unknown, status = 500) {
  const message = error instanceof Error ? error.message : String(error);
  return NextResponse.json({ ok: false, error: message }, { status });
}
