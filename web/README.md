# Product Catalogue — Web

Next.js 14 + TypeScript + TailwindCSS frontend. Talks to a Google Apps Script
Web App that owns the spreadsheet and the Odoo import.

## Local development

```bash
cd web
npm install
cp .env.local.example .env.local
# fill in NEXT_PUBLIC_APPS_SCRIPT_URL and NEXT_PUBLIC_API_TOKEN
npm run dev
# open http://localhost:3000
```

`npm run typecheck` and `npm run lint` are available too.

## Environment variables

| Var | Purpose |
| --- | --- |
| `NEXT_PUBLIC_APPS_SCRIPT_URL` | Deployed Web App URL (`.../exec`). |
| `NEXT_PUBLIC_API_TOKEN`       | Shared secret. Must match `API_TOKEN` script property. |

The token is `NEXT_PUBLIC_*` because we ship a static SPA — the call originates
in the browser. This is **shared-secret-by-obscurity**: it stops casual scrapers
but is not authentication. For real auth, put a tiny proxy (e.g. a Vercel route)
in front and inject the token server-side. See "Hardening" below.

## Deployment

The simplest path: Vercel.

1. Push the `web/` folder to a Git repo.
2. Import into Vercel.
3. Add the two `NEXT_PUBLIC_*` env vars in the project settings.
4. Deploy.

Or static export — `next build && next export` — and host the `out/` folder
anywhere (S3, GCS, Netlify). Apps Script handles all data/CRUD, so a static
host is sufficient.

## Architecture notes

- **Data flow.** Sheet → Apps Script → SPA. The SPA caches `getProducts` for
  10 minutes (TanStack Query). The Refresh-from-Odoo button explicitly
  invalidates that cache.
- **Search.** Built once when products load; filtered in memory on every
  keystroke. No round-trip to the server while typing.
- **Exports.** Generated client-side with SheetJS (XLSX) and jsPDF + autotable
  (PDF) — faster, no Apps Script execution-time limits, easier to style.
- **Persistence.** Working catalogue is mirrored to `localStorage` via Zustand
  `persist`. Saved catalogues live in the spreadsheet. The two are kept
  separate on purpose: a refresh shouldn't silently replace a draft.
- **Source chips.** When the user adds "all of category X", we save that as
  a `Catalogue_Sources` row. Loading a catalogue restores both the chips and
  the products. Removing the chip does *not* remove the products — the user
  can clear products independently. Removing a single product is sticky
  (`manuallyRemoved`) so re-loading a category doesn't bring it back.

## Hardening (future work)

- Replace `NEXT_PUBLIC_API_TOKEN` with a server route (Next.js API route or
  Vercel edge function) that injects the token server-side.
- Add Google OAuth and pass an `id_token` to Apps Script for per-user gating.
- Apps Script web apps deployed `Anyone` are anonymous. Switching to
  `Anyone with Google account` and verifying the user in `doPost` adds a real
  identity layer at the cost of needing a CORS-friendly proxy.

## Tradeoffs

- **Apps Script latency.** First call can be 1–3s (cold). The product cache
  hides this from search; saves are tolerable because they're explicit user
  actions.
- **No streaming / no SSE.** Apps Script can't do it. Refresh is a single
  POST that blocks until the import finishes — fine for office use, not
  fine if your import takes minutes. If it does, run the import on a
  schedule with a Time-driven trigger and just read `last_synced_at` here.
- **PDF in the browser.** Easier and richer than Apps Script's built-in PDF
  export, but no server-side artifact. If you need archived PDFs, add an
  `exportCataloguePdf` action that creates a Doc → exports PDF → saves to
  Drive, and have the UI call it as a second option.
- **Image hosting.** Images are loaded directly from the URLs in the sheet.
  If those URLs require auth, swap them for Drive thumbnail URLs or proxy
  through Apps Script.
