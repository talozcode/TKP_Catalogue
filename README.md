# Product Catalogue

A production-ready web app for building, saving, and exporting product catalogues
from a Google Sheet that is populated from Odoo by an existing Google Apps Script.

## Architecture

```
Browser (Next.js + TS + Tailwind)
        |
        |  POST {APPS_SCRIPT_URL}  (text/plain JSON, token in body)
        v
Google Apps Script Web App
        |  ↳ reads/writes Google Sheet (source of truth)
        |  ↳ wraps existing Odoo import function (server-side only)
        v
Google Sheet  ←  existing Apps Script Odoo importer
```

- Browser **never** talks to Odoo.
- Odoo credentials live as Apps Script properties.
- Sheet is the source of truth.
- Products are cached in the browser; search runs in memory.
- XLSX and PDF are built on the client.

## Repo layout

```
product-catalogue/
├── apps-script/        Google Apps Script backend (paste into script.google.com)
│   ├── Code.gs         doGet / doPost router + auth
│   ├── Utils.gs        sheet + header-map helpers
│   ├── Products.gs     getProducts
│   ├── Catalogues.gs   list/load/save/delete/duplicate
│   ├── Odoo.gs         refreshProductsFromOdoo (wraps existing import)
│   └── appsscript.json
└── web/                Next.js frontend
    ├── app/            App Router pages
    ├── components/     UI
    ├── lib/            API client, store, search, exporters
    └── ...
```

## Setup

1. **Apps Script backend** — see `apps-script/README` section in the file headers.
2. **Web app** — `cd web && npm install && cp .env.local.example .env.local`, then fill in `NEXT_PUBLIC_APPS_SCRIPT_URL` and `NEXT_PUBLIC_API_TOKEN`.
3. `npm run dev` and open http://localhost:3000.

See the inline notes in each file for details and tradeoffs.
