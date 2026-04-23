# Product Catalogue — Apps Script Backend

Drop these `.gs` files (and `appsscript.json`) into the same Apps Script
project as your existing Odoo importer.

## Files

| File | Purpose |
| --- | --- |
| `Code.gs`        | `doGet` / `doPost` router. Auth via `API_TOKEN` script property. |
| `Utils.gs`       | Sheet helpers, header-mapped read/write, metadata, lock, json. |
| `Products.gs`    | `getProducts` — reads the `Products` sheet by header name. |
| `Catalogues.gs`  | List / load / save / delete / duplicate. |
| `Odoo.gs`        | `refreshProductsFromOdoo` — wraps the import function. |
| `OdooImport.gs`  | The actual TKP Odoo importer (`populateProductsFromKosherPlace`). Reads Odoo creds from the `config` tab (B1:B4) and ignore patterns from `B9:B20`. |

## One-time setup

1. Open your spreadsheet → **Extensions → Apps Script**.
2. Add a new file for each `.gs` above and paste the contents.
3. Open `appsscript.json` (Project Settings → "Show 'appsscript.json'") and
   replace it with the version in this folder.
4. **Project settings → Script properties** — add:
   - `API_TOKEN` — long random string. Also goes into the SPA's `.env.local`.
   - `ODOO_IMPORT_FN` *(optional)* — defaults to `populateProductsFromKosherPlace`,
     which is what `OdooImport.gs` exports. Override only if you renamed it.
   - `SPREADSHEET_ID` *(optional)* — only needed if the script isn't bound to
     the right spreadsheet.
5. Run `setup()` once from the editor. This creates the `Catalogues`,
   `Catalogue_Items`, `Catalogue_Sources`, and `App_Metadata` tabs with the
   correct headers. Your `Products` tab is left untouched.
6. **Deploy → New deployment → Web app**:
   - Description: anything.
   - Execute as: **Me**.
   - Who has access: **Anyone**.
   - Click Deploy. Copy the `/exec` URL — that goes into the SPA env.

If you change the `.gs` files later, you must create a *new deployment* (or
update the existing one with a new version) for the changes to take effect on
the deployed URL.

## How the Odoo refresh wrapper works

`refreshProductsFromOdoo` in `Odoo.gs` looks up the function name from the
`ODOO_IMPORT_FN` script property and invokes it. That way:

- We never duplicate your existing import logic.
- Odoo credentials stay in *your* function (which presumably reads them from
  Script properties — please don't accept them as request input).
- After a successful run, we stamp `last_synced_at` in `App_Metadata` so the
  UI can show when the data was last refreshed.

If your existing function is in another file in the same Apps Script project,
it'll be reachable via the global scope. If it lives in a separate project
(library), import it as a library and proxy through a thin local function with
the same name as `ODOO_IMPORT_FN`.

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

### Products *(existing)*
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
