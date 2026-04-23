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
  var fnName = PropertiesService.getScriptProperties().getProperty('ODOO_IMPORT_FN');
  if (!fnName) {
    throw new Error('ODOO_IMPORT_FN script property is not set. ' +
      'Set it to the name of your existing Odoo import function.');
  }
  var fn = this[fnName] || globalThis[fnName];
  if (typeof fn !== 'function') {
    throw new Error('Function "' + fnName + '" was not found in this script project. ' +
      'Make sure the existing import .gs file is part of the same project.');
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
