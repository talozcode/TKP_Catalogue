# Product Catalogue — Apps Script Backend

These files go **into the Apps Script project that already contains your Odoo
importer** (`Code.gs` / `populateProductsFromKosherPlace`). You do **not**
replace anything — you add 5 new files alongside the existing `Code.gs`.

## Add these 5 files

In the Apps Script editor, click ➕ next to "Files" → Script, and use these
exact names. Paste contents from the corresponding file in this folder:

| Add this filename | Paste from | Purpose |
| --- | --- | --- |
| `WebApp`     | `WebApp.gs`     | `doGet` / `doPost` router. Auth via `API_TOKEN`. |
| `Utils`      | `Utils.gs`      | Sheet helpers, header-mapped read/write, lock, json. |
| `Products`   | `Products.gs`   | `getProducts` — reads `Products` by header name. |
| `Catalogues` | `Catalogues.gs` | List / load / save / delete / duplicate. |
| `Odoo`       | `Odoo.gs`       | `refreshProductsFromOdoo` — calls your importer. |

Your existing `Code.gs` (the Odoo importer) stays exactly as it is. Do not
delete or rename it. The router calls `populateProductsFromKosherPlace` from
your `Code.gs` automatically.

## Update appsscript.json

Open project settings → **"Show 'appsscript.json' manifest file"** if it isn't
visible, then make sure the `webapp` block matches:

```json
{
  "webapp": {
    "executeAs": "USER_DEPLOYING",
    "access": "ANYONE_ANONYMOUS"
  }
}
```

(The full file in this repo is `appsscript.json` — copy the `webapp` block
into your existing manifest; don't overwrite the whole file if you already
have other settings there.)

## Script properties

Project settings → Script properties → Add. Only one is required:

| Key | Value |
| --- | --- |
| `API_TOKEN`      | A long random string. Also goes in Vercel as `NEXT_PUBLIC_API_TOKEN`. |
| `ODOO_IMPORT_FN` | *(optional)* Defaults to `populateProductsFromKosherPlace`. Set only if you renamed the function. |
| `SPREADSHEET_ID` | *(optional)* Only if the project isn't bound to the right spreadsheet. |

## Run `setup()` once

In the editor, pick `setup` from the function dropdown → ▶. Approve the auth
prompt. This creates four new tabs without touching `Products` or `config`:

- `Catalogues`
- `Catalogue_Items`
- `Catalogue_Sources`
- `App_Metadata`

## Deploy

**Deploy → New deployment → Web app**:

- Description: anything.
- Execute as: **Me**.
- Who has access: **Anyone**.
- Click Deploy. Copy the `…/exec` URL.

If you've deployed before and just edited the `.gs` files: **Deploy → Manage
deployments → ✏️ pencil → Version: New version → Deploy**. Same URL, new code.

**Verify:** open the `…/exec` URL in a browser. You should see:

```json
{"ok":true,"service":"product-catalogue","ts":"…"}
```

If you instead see "Script function not found: doGet", the new files weren't
saved or the deployment wasn't updated to a new version.

## API contract

`POST <web app URL>` with `Content-Type: text/plain;charset=utf-8` and body:

```json
{ "token": "...", "action": "<action>", "params": { ... } }
```

Returns:

```json
{ "ok": true,  "data": ... }
{ "ok": false, "error": "..." }
```

Actions:

| Action                     | Params                                | Returns |
| -------------------------- | ------------------------------------- | ------- |
| `getProducts`              | —                                     | `{ products, lastSyncedAt, count }` |
| `refreshProductsFromOdoo`  | —                                     | `{ startedAt, finishedAt, productCount, lastSyncedAt }` |
| `listCatalogues`           | —                                     | `{ catalogues: [...] }` |
| `loadCatalogue`            | `{ catalogueId }`                     | `{ catalogue, items, sources }` |
| `saveCatalogue`            | `{ catalogue, items, sources }`       | `{ catalogueId, updatedAt }` |
| `deleteCatalogue`          | `{ catalogueId }`                     | `{ deleted: true }` |
| `duplicateCatalogue`       | `{ catalogueId, newName? }`           | `{ catalogueId }` |
| `getMetadata`              | —                                     | `{ lastSyncedAt }` |

## Spreadsheet schema

Read/written by **header name** (column position can change).

### Products *(existing — your importer writes this)*
Internal Reference, Product Name, Product Name (Hebrew), Product Barcode,
UOM, Packaging, Packaging UOM, Packaging Barcode, Date Created, Product Tags,
Product Category, Ecommerce Category, Sales Price, Wholesale Price, Image URL.

### Catalogues
`catalogue_id`, `catalogue_name`, `notes`,
`default_discount_percent`, `show_discount_column`,
`export_mode`, `columns_visibility_json`,
`created_at`, `updated_at`.

### Catalogue_Items
`catalogue_id`, `product_key`, `selected_order`,
`excluded_from_discount`, `custom_note`,
`manually_removed`, `added_by_source`.

### Catalogue_Sources
`catalogue_id`, `source_type` (`category`|`tag`), `source_value`.

### App_Metadata
`key`, `value`. Stores `last_synced_at`.
