/**
 * Product Catalogue — Apps Script Web App entry point.
 *
 * Setup (one-time):
 *  1. Open the Google Sheet that holds the "Products" tab.
 *  2. Extensions → Apps Script. Paste these .gs files (Code, Utils, Products,
 *     Catalogues, Odoo) and the appsscript.json.
 *  3. Project settings → Script properties:
 *       API_TOKEN          = a long random string (also goes in web/.env.local)
 *       SPREADSHEET_ID     = the id of the spreadsheet (optional — defaults to
 *                            the bound spreadsheet)
 *       ODOO_IMPORT_FN     = name of the existing function that imports from
 *                            Odoo into the Products sheet
 *                            (e.g. "importProductsFromOdoo")
 *  4. Deploy → New deployment → Web app
 *       Execute as: Me
 *       Who has access: Anyone (the token in the body is the auth)
 *  5. Copy the deployment URL into web/.env.local as
 *     NEXT_PUBLIC_APPS_SCRIPT_URL.
 *
 * Run `setup()` once from the editor to create the Catalogues, Catalogue_Items,
 * Catalogue_Sources and App_Metadata tabs with the right headers.
 */

function doGet(e) {
  // Health check, useful for verifying the deployment from a browser.
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, service: 'product-catalogue', ts: nowIso_() }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var body = {};
    if (e && e.postData && e.postData.contents) {
      body = JSON.parse(e.postData.contents);
    }
    requireToken_(body.token);

    var action = body.action;
    var params = body.params || {};

    var result;
    switch (action) {
      case 'getProducts':              result = getProducts(params); break;
      case 'refreshProductsFromOdoo':  result = refreshProductsFromOdoo(params); break;
      case 'listCatalogues':           result = listCatalogues(params); break;
      case 'loadCatalogue':            result = loadCatalogue(params); break;
      case 'saveCatalogue':            result = saveCatalogue(params); break;
      case 'deleteCatalogue':          result = deleteCatalogue(params); break;
      case 'duplicateCatalogue':       result = duplicateCatalogue(params); break;
      case 'getMetadata':              result = getMetadata(params); break;
      default: throw new Error('Unknown action: ' + action);
    }
    return json_({ ok: true, data: result });
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message || err) });
  }
}

/**
 * Run once from the Apps Script editor to create the supporting tabs.
 * Idempotent: existing tabs are left alone.
 */
function setup() {
  ensureSheet_(SHEETS.CATALOGUES, [
    'catalogue_id', 'catalogue_name', 'notes',
    'default_discount_percent', 'show_discount_column',
    'export_mode', 'columns_visibility_json',
    'created_at', 'updated_at'
  ]);
  ensureSheet_(SHEETS.ITEMS, [
    'catalogue_id', 'product_key', 'selected_order',
    'excluded_from_discount', 'custom_note',
    'manually_removed', 'added_by_source'
  ]);
  ensureSheet_(SHEETS.SOURCES, [
    'catalogue_id', 'source_type', 'source_value'
  ]);
  ensureSheet_(SHEETS.METADATA, ['key', 'value']);
}
