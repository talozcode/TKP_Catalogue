# Product Catalogue

A production-ready web app for building, saving, and exporting product
catalogues from a Google Sheet that is populated from Odoo by an existing
Google Apps Script.

## Architecture

```
Browser (Next.js + TS + Tailwind)
        |
        |  fetch /api/*  (same-origin, no token in browser)
        v
Next.js API routes (Vercel serverless)
        |  ↳ google-auth-library (service account JWT)
        v
Google Sheets API
        |
        v
Google Sheet  ←  existing Apps Script Odoo importer (time-driven trigger)
```

- Browser **never** talks to Sheets directly — the service-account key
  stays on the server.
- Browser **never** talks to Odoo. The existing Apps Script importer
  refreshes the `Products` tab on a schedule.
- Sheet is the source of truth for both products and saved catalogues.
- Products are cached in the browser; search runs in memory.
- XLSX and PDF are built on the client.

## Repo layout

```
product-catalogue/
└── web/                Next.js app (deploy this to Vercel)
    ├── app/
    │   ├── api/        /api/products, /api/catalogues, /api/setup
    │   ├── page.tsx    main UI
    │   └── ...
    ├── components/     UI
    ├── lib/
    │   ├── sheets.ts            Google Sheets client (server-only)
    │   ├── catalogue-server.ts  business logic (server-only)
    │   ├── api.ts               browser → /api/* client
    │   └── ...
    └── ...
```

## Setup

See [`web/README.md`](web/README.md) for the full walkthrough:

1. Create a Google Cloud service account, download its JSON key, share
   the spreadsheet with its email.
2. Set `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY`,
   `GOOGLE_SHEET_ID` in `web/.env.local` (and on Vercel).
3. `cd web && npm install && npm run dev`.
4. `curl -X POST http://localhost:3000/api/setup` once to create the
   supporting tabs.
5. In your existing Apps Script project, add a time-driven trigger on
   `populateProductsFromKosherPlace` so the `Products` tab stays fresh.
