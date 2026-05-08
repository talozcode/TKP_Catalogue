'use client';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Lock } from 'lucide-react';
import clsx from 'clsx';

const LOGO_URL =
  'https://res.cloudinary.com/dakhwegyt/image/upload/v1776678465/kp-primary_4x_totp25.png';

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const from = params.get('from') || '/';

  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // If APP_PASSWORD is not set the app is open — redirect immediately.
  useEffect(() => {
    fetch('/api/auth/login', { method: 'POST', body: JSON.stringify({ password: '' }), headers: { 'Content-Type': 'application/json' } })
      .then((r) => { if (r.ok) router.replace(from); })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      if (res.ok) {
        router.replace(from);
      } else {
        const data = await res.json();
        setError(data.error || 'Incorrect password');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={LOGO_URL} alt="The Kosher Place" className="h-16 w-auto" />
          <div className="text-center">
            <div className="font-serif text-2xl font-semibold text-brand">Catalogue</div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-gold">
              Build · Preview · Export
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-line bg-white p-8 shadow-card">
          <div className="mb-6 flex items-center gap-2 text-sm text-muted">
            <Lock size={14} />
            Enter your password to continue
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <input
                type={show ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                autoFocus
                autoComplete="current-password"
                className={clsx(
                  'w-full rounded-lg border bg-white px-3 py-2.5 pr-10 text-sm text-ink placeholder-muted outline-none transition focus:ring-2 focus:ring-brand/30',
                  error ? 'border-red-400 focus:border-red-400' : 'border-line focus:border-brand'
                )}
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
                tabIndex={-1}
                aria-label={show ? 'Hide password' : 'Show password'}
              >
                {show ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {error ? (
              <p className="text-xs font-medium text-red-600">{error}</p>
            ) : null}

            <button
              type="submit"
              disabled={loading || !password}
              className="w-full rounded-lg bg-brand py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brandDeep disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>

        <p className="mt-4 text-center text-[11px] text-muted">
          The Kosher Place · Internal tool
        </p>
      </div>
    </div>
  );
}
