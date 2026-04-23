# Product Catalogue — Web

Next.js 14 + TypeScript + TailwindCSS. Reads and writes a Google Sheet
directly via the Sheets API using a service-account key. There is no
Apps Script in front of the spreadsheet anymore — the import that
populates the `Products` tab from Odoo runs as a separate, time-driven
trigger inside your existing Apps Script project.

## Local development

```bash
cd web
npm install
cp .env.local.example .env.local
# fill in GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, GOOGLE_SHEET_ID
npm run dev
# open http://localhost:3000
```

`npm run typecheck` and `npm run lint` are available too.

## One-time Google Cloud setup

1. **Create a Google Cloud project** at <https://console.cloud.google.com>
   (any project, free tier is fine).
2. **Enable the Google Sheets API**: APIs & Services → Library → "Google
   Sheets API" → Enable.
3. **Create a service account**: IAM & Admin → Service Accounts → Create.
   Name it anything (e.g. `product-catalogue`). No roles needed.
4. **Create a JSON key**: open the service account → Keys → Add Key →
   Create new key → JSON. Download it.
5. **Share the spreadsheet** with the service account's email (looks like
   `product-catalogue@your-project.iam.gserviceaccount.com`). Give it
   **Editor** access.
6. **Copy the spreadsheet ID** from the URL (the long token between
   `/d/` and `/edit`).

## Environment variables

| Var | Purpose |
| --- | --- |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | The `client_email` from the JSON key file. |
| `GOOGLE_PRIVATE_KEY`           | The `private_key` from the JSON key file (keep the `\n` escapes). |
| `GOOGLE_SHEET_ID`              | The spreadsheet ID from the URL. |

These are **server-only**. They never reach the browser. The browser
talks to `/api/*` routes hosted by this Next.js app; those routes use
the service account to access Sheets.

## Initialise the supporting tabs

Once after deploy (and once locally), hit the setup endpoint to create
the `Catalogues`, `Catalogue_Items`, `Catalogue_Sources`, and
`App_Metadata` tabs (idempotent — existing tabs are left alone):

```bash
curl -X POST https://your-deployment.vercel.app/api/setup
# locally:
curl -X POST http://localhost:3000/api/setup
```

## Keeping `Products` fresh

The web app does **not** import from Odoo. Your existing Apps Script
function `populateProductsFromKosherPlace` does that. Set up a
**time-driven trigger** in the Apps Script editor (Triggers → Add
trigger → choose function → Time-driven → Hour timer → Every hour) and
the `Products` tab will stay fresh on its own.

## Deployment (Vercel)

1. Push this repo to GitHub.
2. Import the repo into Vercel and select `web/` as the root.
3. Add the three env vars above in **Project Settings → Environment
   Variables** (apply to Production + Preview + Development).
4. Deploy.
5. Hit `POST /api/setup` once to create the supporting tabs.

## Architecture notes

- **Data flow.** Browser → Next.js API route → Google Sheets API. The
  SPA caches `getProducts` for 10 minutes (TanStack Query) so search
  doesn't hit Sheets on every keystroke.
- **Search.** Built once when products load; filtered in memory on
  every keystroke. No round-trip to the server while typing.
- **Exports.** Generated client-side with SheetJS (XLSX) and jsPDF +
  autotable (PDF) — easier to style and no server limits.
- **Persistence.** Working catalogue is mirrored to `localStorage` via
  Zustand `persist`. Saved catalogues live in the spreadsheet. The two
  are kept separate so a product refresh doesn't silently replace a
  draft.
- **Source chips.** When the user adds "all of category X" we save that
  as a `Catalogue_Sources` row. Loading a catalogue restores both the
  chips and the products. Removing a single product is sticky
  (`manuallyRemoved`) so re-loading a category doesn't bring it back.

## Tradeoffs

- **No "Refresh from Odoo" button.** The Sheets-API path can't trigger
  an Apps Script function from the outside without OAuth or a separate
  Apps Script Web App. Letting the existing time-driven trigger do the
  refresh is simpler and removes the last reason this app needed an
  Apps Script bridge.
- **Sheets API write throughput.** Sheets handles a few hundred items
  per save comfortably. For thousands of items per save, switch to a
  proper database (Postgres / Turso / Supabase) — the architecture
  doesn't change, only `lib/sheets.ts` does.
- **PDF in the browser.** Faster than server-rendering and avoids any
  serverless cold-start cost. If you need archived PDFs, add an
  `/api/catalogues/[id]/pdf` route that builds and stores them.
