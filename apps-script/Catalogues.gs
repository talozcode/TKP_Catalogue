/**
 * Catalogue persistence — list / load / save / delete / duplicate.
 *
 * Save uses a "replace items + sources" strategy: simpler and safer than
 * diff-based updates for human-scale catalogues (a few hundred items max).
 */

function listCatalogues(_params) {
  var rows = readAll_(SHEETS.CATALOGUES);
  // Sort newest first.
  rows.sort(function (a, b) {
    return String(b.updated_at || '').localeCompare(String(a.updated_at || ''));
  });
  return {
    catalogues: rows.map(function (r) {
      return {
        catalogueId:            str_(r.catalogue_id),
        catalogueName:          str_(r.catalogue_name),
        notes:                  str_(r.notes),
        defaultDiscountPercent: num_(r.default_discount_percent) || 0,
        showDiscountColumn:     truthy_(r.show_discount_column),
        exportMode:             str_(r.export_mode) || 'customer',
        createdAt:              str_(r.created_at),
        updatedAt:              str_(r.updated_at)
      };
    })
  };
}

function loadCatalogue(params) {
  var id = params && params.catalogueId;
  if (!id) throw new Error('catalogueId required');

  var meta = readAll_(SHEETS.CATALOGUES).filter(function (r) {
    return String(r.catalogue_id) === String(id);
  })[0];
  if (!meta) throw new Error('Catalogue not found');

  var items = readAll_(SHEETS.ITEMS)
    .filter(function (r) { return String(r.catalogue_id) === String(id); })
    .sort(function (a, b) { return (Number(a.selected_order) || 0) - (Number(b.selected_order) || 0); })
    .map(function (r) {
      return {
        productKey:           str_(r.product_key),
        selectedOrder:        Number(r.selected_order) || 0,
        excludedFromDiscount: truthy_(r.excluded_from_discount),
        customNote:           str_(r.custom_note),
        manuallyRemoved:      truthy_(r.manually_removed),
        addedBySource:        str_(r.added_by_source) || 'manual'
      };
    });

  var sources = readAll_(SHEETS.SOURCES)
    .filter(function (r) { return String(r.catalogue_id) === String(id); })
    .map(function (r) {
      return { sourceType: str_(r.source_type), sourceValue: str_(r.source_value) };
    });

  var columnsVisibility = {};
  if (meta.columns_visibility_json) {
    try { columnsVisibility = JSON.parse(meta.columns_visibility_json); } catch (e) {}
  }

  return {
    catalogue: {
      catalogueId:            str_(meta.catalogue_id),
      catalogueName:          str_(meta.catalogue_name),
      notes:                  str_(meta.notes),
      defaultDiscountPercent: num_(meta.default_discount_percent) || 0,
      showDiscountColumn:     truthy_(meta.show_discount_column),
      exportMode:             str_(meta.export_mode) || 'customer',
      columnsVisibility:      columnsVisibility,
      createdAt:              str_(meta.created_at),
      updatedAt:              str_(meta.updated_at)
    },
    items:   items,
    sources: sources
  };
}

/**
 * Insert or update a catalogue + its items + its sources.
 * params: { catalogue: {...}, items: [...], sources: [...] }
 */
function saveCatalogue(params) {
  var c = (params && params.catalogue) || {};
  var items = (params && params.items) || [];
  var sources = (params && params.sources) || [];
  if (!c.catalogueName) throw new Error('catalogueName required');

  var lock = LockService.getDocumentLock();
  lock.waitLock(20000);
  try {
    var sh = getSheet_(SHEETS.CATALOGUES);
    var existing = readAll_(SHEETS.CATALOGUES);
    var now = nowIso_();
    var id = c.catalogueId;
    var rowIndex = -1;

    if (id) {
      for (var i = 0; i < existing.length; i++) {
        if (String(existing[i].catalogue_id) === String(id)) { rowIndex = i; break; }
      }
    }

    var record = {
      catalogue_id:             id || uuid_(),
      catalogue_name:           c.catalogueName,
      notes:                    c.notes || '',
      default_discount_percent: c.defaultDiscountPercent || 0,
      show_discount_column:     !!c.showDiscountColumn,
      export_mode:              c.exportMode || 'customer',
      columns_visibility_json:  JSON.stringify(c.columnsVisibility || {}),
      created_at:               (rowIndex >= 0 && existing[rowIndex].created_at) ? existing[rowIndex].created_at : now,
      updated_at:               now
    };

    if (rowIndex >= 0) {
      // Update in place.
      var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
      var rowVals = headers.map(function (h) {
        var k = String(h || '').trim();
        return k in record ? record[k] : '';
      });
      sh.getRange(rowIndex + 2, 1, 1, headers.length).setValues([rowVals]);
    } else {
      appendByHeaders_(SHEETS.CATALOGUES, record);
    }

    // Replace items + sources.
    deleteRowsWhere_(SHEETS.ITEMS, 'catalogue_id', record.catalogue_id);
    deleteRowsWhere_(SHEETS.SOURCES, 'catalogue_id', record.catalogue_id);

    items.forEach(function (it, idx) {
      appendByHeaders_(SHEETS.ITEMS, {
        catalogue_id:           record.catalogue_id,
        product_key:            it.productKey,
        selected_order:         it.selectedOrder != null ? it.selectedOrder : idx,
        excluded_from_discount: !!it.excludedFromDiscount,
        custom_note:            it.customNote || '',
        manually_removed:       !!it.manuallyRemoved,
        added_by_source:        it.addedBySource || 'manual'
      });
    });

    sources.forEach(function (s) {
      appendByHeaders_(SHEETS.SOURCES, {
        catalogue_id: record.catalogue_id,
        source_type:  s.sourceType,
        source_value: s.sourceValue
      });
    });

    return { catalogueId: record.catalogue_id, updatedAt: record.updated_at };
  } finally {
    lock.releaseLock();
  }
}

function deleteCatalogue(params) {
  var id = params && params.catalogueId;
  if (!id) throw new Error('catalogueId required');
  var lock = LockService.getDocumentLock();
  lock.waitLock(15000);
  try {
    deleteRowsWhere_(SHEETS.CATALOGUES, 'catalogue_id', id);
    deleteRowsWhere_(SHEETS.ITEMS, 'catalogue_id', id);
    deleteRowsWhere_(SHEETS.SOURCES, 'catalogue_id', id);
    return { deleted: true };
  } finally {
    lock.releaseLock();
  }
}

function duplicateCatalogue(params) {
  var id = params && params.catalogueId;
  var newName = (params && params.newName) || '';
  if (!id) throw new Error('catalogueId required');
  var loaded = loadCatalogue({ catalogueId: id });
  var copy = loaded.catalogue;
  copy.catalogueId = '';                                // force new id
  copy.catalogueName = newName || (copy.catalogueName + ' (copy)');
  return saveCatalogue({
    catalogue: copy,
    items: loaded.items,
    sources: loaded.sources
  });
}

function truthy_(v) {
  if (v === true) return true;
  if (typeof v === 'string') return /^(true|1|yes|y)$/i.test(v.trim());
  return !!v;
}
