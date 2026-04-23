/**
 * Trigger the existing Apps Script function that imports products from Odoo.
 *
 * The existing function name is read from the script property ODOO_IMPORT_FN
 * so we don't have to hardcode it. Set it to e.g. "importProductsFromOdoo".
 *
 * The wrapped function should:
 *   - read Odoo credentials from Script properties (NEVER from request input)
 *   - rewrite / refresh the "Products" sheet
 *
 * If the existing function doesn't update a "last sync" anywhere, this wrapper
 * stamps `last_synced_at` in App_Metadata after a successful run.
 */
function refreshProductsFromOdoo(_params) {
  // Default to the canonical TKP importer if the property isn't set, so the
  // wrapper works out of the box once OdooImport.gs is in the project.
  var fnName = PropertiesService.getScriptProperties().getProperty('ODOO_IMPORT_FN')
    || 'populateProductsFromKosherPlace';
  var fn = this[fnName] || globalThis[fnName];
  if (typeof fn !== 'function') {
    throw new Error('Function "' + fnName + '" was not found in this script project. ' +
      'Add OdooImport.gs (or set ODOO_IMPORT_FN to a function that exists here).');
  }

  var startedAt = nowIso_();
  fn.call(this);
  var finishedAt = nowIso_();
  setMetadata_('last_synced_at', finishedAt);

  var count = readAll_(SHEETS.PRODUCTS).length;
  return {
    startedAt: startedAt,
    finishedAt: finishedAt,
    productCount: count,
    lastSyncedAt: finishedAt
  };
}
