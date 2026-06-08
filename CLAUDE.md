# Product Catalogue — CLAUDE.md

## What this is

A Next.js 14 + TypeScript + Tailwind web app for building, saving, and exporting product catalogues. Products come from a Google Sheet populated by an existing Apps Script/Odoo sync. The UI lets staff search products, build a catalogue (drag-drop, bulk add by category/tag), configure columns and discounts, then export as PDF or XLSX.

Live at Vercel (see Practical Tools Vercel memory entry for deploy details).

---

## Architecture

```
Browser (Next.js SPA)
    |  fetch /api/*
    v
Next.js API routes (Vercel serverless)
    |  googleapis JWT (service account)
    v
Google Sheets API
    |
    v
Google Sheet  <--  Apps Script (Odoo importer, time-driven trigger)
```

- Browser never talks to Sheets or Odoo directly.
- Service-account credentials are server-only env vars.
- Products are cached 10 min in TanStack Query; search runs in memory.
- XLSX and PDF are built entirely on the client.
- Working catalogue draft persists to `localStorage` via Zustand `persist`.
- Saved catalogues live in the spreadsheet (3 sheets).

---

## Env vars (required)

| Var | Source |
|-----|--------|
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | `client_email` from JSON key |
| `GOOGLE_PRIVATE_KEY` | `private_key` from JSON key (keep `\n` escapes) |
| `GOOGLE_SHEET_ID` | Spreadsheet ID from URL |
| `APP_PASSWORD` | Password for the login page (SHA-256 hashed at runtime) |

Set in `web/.env.local` locally and in Vercel project settings for production.

---

## Repo layout

```
product-catalogue/
└── web/                  Next.js app root (Vercel root dir = web/)
    ├── app/
    │   ├── api/
    │   │   ├── products/         GET  - list all products
    │   │   ├── catalogues/       GET list, POST save
    │   │   ├── catalogues/[id]/  GET load, DELETE delete
    │   │   ├── catalogues/[id]/duplicate/  POST clone
    │   │   ├── auth/login/       POST authenticate
    │   │   ├── auth/logout/      POST sign out
    │   │   ├── diagnostics/      GET debug sheet headers
    │   │   └── setup/            POST create required sheets
    │   ├── login/page.tsx        Login form
    │   └── page.tsx              Main SPA shell
    ├── components/
    │   ├── ui/                   Button, Input, Badge, Dialog, Drawer, Toast, Spinner
    │   ├── Header.tsx            Top bar (counts, logout)
    │   ├── SearchBar.tsx         Filters + tag multi-select
    │   ├── ProductGrid.tsx       Paginated grid (60/page)
    │   ├── ProductCard.tsx       Card with add/remove
    │   ├── Drawer.tsx            Right-side slide-out
    │   ├── CataloguePane.tsx     Build/Preview tabs
    │   ├── CataloguePanel.tsx    Drag-drop item list
    │   ├── CataloguePreview.tsx  Live export preview
    │   ├── CatalogueToolbar.tsx  Settings + export buttons
    │   ├── ColumnsDialog.tsx     Column visibility + order
    │   ├── SaveCatalogueDialog.tsx
    │   └── LoadCatalogueDialog.tsx
    └── lib/
        ├── types.ts              All shared TS types
        ├── api.ts                Browser -> /api/* client
        ├── store.ts              Zustand catalogue draft store
        ├── sheets.ts             Google Sheets API wrapper (server-only)
        ├── catalogue-server.ts   Business logic (server-only)
        ├── search.ts             In-memory index + filters
        ├── columns.ts            Column config + cell rendering
        ├── format.ts             formatMoney, formatDate, applyDiscount
        ├── export-xlsx.ts        SheetJS XLSX export (client)
        ├── export-pdf.ts         jsPDF export with Hebrew support (client)
        ├── catalogue-name.ts     Name/filename helpers
        └── route-helpers.ts      ok() / fail() response builders
```

---

## Google Sheets schema

Five tabs, all managed by the app:

| Tab | Purpose |
|-----|---------|
| `Products` | Read-only. Populated by Apps Script from Odoo. |
| `Catalogues` | One row per saved catalogue (metadata). |
| `Catalogue_Items` | One row per product per catalogue. |
| `Catalogue_Sources` | Tracks which category/tag bulk-adds were applied. |
| `App_Metadata` | Key-value store (e.g. lastSyncedAt). |

Run `POST /api/setup` once after deploy to create the four writable tabs. Idempotent.

---

## Authentication

- Single password (`APP_PASSWORD`). SHA-256 hashed; stored as an httpOnly cookie (`tkp_auth`) valid 30 days.
- `middleware.ts` guards all routes except `/login` and `/api/auth/*`.
- If `APP_PASSWORD` is unset, the app is open (dev mode).
- Login page preserves the original `?from=` path on redirect.

---

## Key lib modules

### `lib/sheets.ts` (server-only)
Low-level Sheets API wrapper. All reads/writes go through here.
- `readAll(sheetName)` - rows as objects keyed by header
- `readAllWithHeaders(sheetName)` - includes `__cells[]` and `__rowIndex`
- `appendByHeaders` / `appendManyByHeaders` - insert rows
- `updateRowByHeaders(name, rowIndex, obj)` - update a row in place
- `deleteRowsWhere(name, keyHeader, keyValue)` - delete matching rows
- `ensureSheet(name, headers)` - create tab + header if missing
- `normalizePrivateKey()` - handles Vercel's literal `\n` in env vars

### `lib/catalogue-server.ts` (server-only)
Business logic called by API routes. Never import in browser code.
- `getProducts()` - reads Products tab, maps via `mapProduct()`, filters for valid rows
- `mapProduct(row)` - handles many possible Hebrew field name variants
- `listCatalogues()` / `loadCatalogue(id)` / `saveCatalogue(input)` / `deleteCatalogue(id)` / `duplicateCatalogue(id)`

### `lib/store.ts` (client-only)
Zustand store, persisted to `localStorage` as `catalogue-draft-v1`.
- Key state: `items[]`, `sources[]`, column settings, discount, exportMode
- `catalogueId` is NOT persisted (cleared on page reload to avoid stale saves)
- `visibleItems(state)` - helper returning non-removed items sorted by order
- Sources track bulk-adds (category/tag); `manuallyRemoved` flag on items makes per-product removals sticky across source reloads

### `lib/search.ts` (client-only)
- `buildIndex(products)` - pre-indexes haystacks once when products load
- `searchProducts(index, filters)` - all filters applied in memory; supports freetext tokens, category, include/exclude tags, onlyNew, inStockOnly, hidePriceZero

### `lib/columns.ts`
14 available columns: `image`, `internalReference`, `productName`, `productNameHe`, `barcode`, `uom`, `packaging`, `category`, `tags`, `salesPrice`, `wholesalePrice`, `discount`, `finalPrice`, `note`.
- `resolveColumns(opts)` - returns ordered, visible columns for current exportMode
- `cellText(columnId, context)` / `cellRaw(columnId, context)` - render a cell for display or export

### `lib/export-pdf.ts` (client-only)
Most complex module (~466 lines). Key points:
- Loads Open Sans Hebrew font from `/public/fonts/Hebrew-Regular.ttf` and embeds it in the PDF.
- `toVisualRtl(text)` reverses Hebrew characters + mirrors brackets for correct RTL rendering in jsPDF.
- `drawHebrewCell()` hooks into autotable's `willDrawCell`/`didDrawCell` to overlay Hebrew text manually.
- Product images are fetched (base64) in batches of 8 to avoid connection limits.
- Landscape A4, branded header (logo + name + date + discount notice + notes), footer (page number + brand).

---

## Data flows

**Load products** (on page mount):
```
page.tsx -> useQuery(['products']) -> GET /api/products
  -> getProducts() -> readAll(PRODUCTS) -> mapProduct() each row
  -> buildIndex() stored in React state -> SearchBar + ProductGrid
```

**Add product to catalogue**:
```
ProductCard (onAdd) -> store.addProduct(key, source) -> Zustand -> CataloguePanel re-renders
```

**Bulk add by category/tag**:
```
SearchBar chip click -> productsByCategory/Tag() -> store.addManyProducts() + store.addSource()
```

**Save catalogue**:
```
CatalogueToolbar -> SaveCatalogueDialog -> api.saveCatalogue(payload)
  -> POST /api/catalogues -> saveCatalogue() -> writes CATALOGUES + ITEMS + SOURCES sheets
```

**Load catalogue**:
```
LoadCatalogueDialog -> api.loadCatalogue(id) -> GET /api/catalogues/[id]
  -> loadCatalogue() -> reads 3 sheets -> store.loadFromServer(catalogue, items, sources)
```

**Export PDF**:
```
CatalogueToolbar -> exportToPdf({ items, columns, discount, ... })
  -> fetch logo + font -> batch-fetch product images -> jspdf-autotable -> download
```

---

## Common tasks

### Add a new product field
1. Add field to `Product` in `lib/types.ts`
2. Map it in `mapProduct()` in `lib/catalogue-server.ts`
3. Add a column entry in `lib/columns.ts` (id, label, cellText, cellRaw)
4. It will appear in `ColumnsDialog` automatically if added to `COLUMN_DEFS`

### Add a new search filter
1. Add to `SearchFilters` in `lib/search.ts`
2. Add filter logic in `searchProducts()`
3. Add UI control in `SearchBar.tsx` with a callback prop wired through `page.tsx`

### Add a new API route
1. Create `app/api/[name]/route.ts`
2. Use `ok(data)` / `fail(message, status)` from `lib/route-helpers.ts` for responses
3. Use `catalogue-server.ts` or `sheets.ts` for data access
4. Add client wrapper in `lib/api.ts`

### Run locally
```bash
cd web
npm install
cp .env.local.example .env.local  # fill in Google + APP_PASSWORD vars
npm run dev                        # http://localhost:3000
npm run typecheck
npm run lint
```

### Initialize sheets (once after deploy)
```bash
curl -X POST https://your-deployment.vercel.app/api/setup
```

---

## Known quirks

- `GOOGLE_PRIVATE_KEY` on Vercel arrives with literal `\n` strings; `normalizePrivateKey()` converts them to actual newlines.
- `next.config.mjs` sets `images.unoptimized: true` because product images come from arbitrary Odoo URLs that Next.js image optimization can't proxy.
- The `diagnostics` API route is a dev tool; leave it in but it's not used by the UI.
- jsPDF does not natively support RTL; the Hebrew rendering is manual (character reversal + custom draw hooks). Do not replace jspdf-autotable without accounting for this.
- `catalogueId` is intentionally excluded from Zustand `persist` so the draft never auto-saves over a previously saved catalogue on reload.
