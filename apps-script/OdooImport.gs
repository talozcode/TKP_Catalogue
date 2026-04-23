/************************************************************
 * ODOO -> PRODUCTS IMPORT (Kosher Place only, all active products)
 *
 * Keeps the existing config/auth pattern from your original script.
 * Imports ALL non-archived products for:
 *   The Kosher Place (Thailand) Co. Ltd
 *
 * Exports:
 * - Internal Reference
 * - Product Name
 * - Product Name (Hebrew)
 * - Product Barcode
 * - UOM
 * - Packaging
 * - Packaging UOM
 * - Packaging Barcode
 * - Date Created
 * - Product Tags
 * - Product Category
 * - Ecommerce Category
 * - Sales Price
 * - Wholesale Price
 * - Image URL
 *
 * Important:
 * - Tags are pulled using the exact Studio field from your working script:
 *   x_studio_many2many_field_XjGRF
 * - The script first checks whether that Studio field lives on
 *   product.template or product.product, then resolves tag names from the
 *   related model.
 * - Shared products (company_id = false) are included.
 * - Archived products are excluded.
 * - Sales Price uses product lst_price when available, otherwise template list_price.
 * - Wholesale Price is read from product.pricelist.item for quantity 1.
 * - Only fixed-price pricelist rules are exported as a single numeric price.
 ************************************************************/

const PRODUCTS_TAB_NAME = 'Products';
const CONFIG_TAB_NAME = 'config';
const IGNORE_INTERNAL_REFERENCES_RANGE = 'B9:B20';

const SOURCE_PRODUCT_COMPANY_NAME = 'The Kosher Place (Thailand) Co. Ltd';
const WHOLESALE_PRICELIST_NAME = 'New TKP/Wholesale Pricelist';
const TAGS_FIELD_NAME = 'x_studio_many2many_field_XjGRF';
const HEBREW_LANG_CANDIDATES = ['he_IL', 'he_001', 'he'];

let __CFG_CACHE = null;
let __UID_CACHE = null;
let __FIELDS_META_CACHE = {};

// Kept for backward compatibility with the old bound function name.
function populateProductsAndJcafeOnHand() {
  populateProductsFromKosherPlace();
}

function populateProductsFromKosherPlace() {
  getConfig_();
  const ignoredInternalReferencePatterns = getIgnoredInternalReferencePatterns_();

  const sourceCompany = findCompanyByName_(SOURCE_PRODUCT_COMPANY_NAME);
  if (!sourceCompany) {
    throw new Error('Source product company not found: ' + SOURCE_PRODUCT_COMPANY_NAME);
  }

  const companyCtx = buildCompanyContext_(sourceCompany.id);

  const wholesalePricelist = findPricelistByNameForCompany_(
    WHOLESALE_PRICELIST_NAME,
    sourceCompany.id,
    companyCtx
  );
  if (!wholesalePricelist) {
    throw new Error('Wholesale pricelist not found: ' + WHOLESALE_PRICELIST_NAME);
  }

  const productFieldsMeta = getFieldsMeta_('product.product');
  const templateFieldsMeta = getFieldsMeta_('product.template');
  const packagingFieldsMeta = getFieldsMeta_('product.packaging');

  const studioInfo = findStudioM2MField_(TAGS_FIELD_NAME, companyCtx);
  if (!studioInfo.exists) {
    throw new Error('Studio tags field not found: ' + TAGS_FIELD_NAME);
  }
  if (!studioInfo.isM2M || !studioInfo.relation) {
    throw new Error('Studio tags field is not a many2many with a relation model: ' + TAGS_FIELD_NAME);
  }

  const ecommerceInfo = getMany2manyFieldInfo_(productFieldsMeta, templateFieldsMeta, 'public_categ_ids');

  const templates = getActiveTemplatesForCompany_(sourceCompany.id, templateFieldsMeta, studioInfo, companyCtx);
  const templateMap = {};
  const variantIds = [];

  templates.forEach(t => {
    templateMap[t.id] = t;
    const vids = Array.isArray(t.product_variant_ids) ? t.product_variant_ids : [];
    vids.forEach(id => {
      if (id) variantIds.push(id);
    });
  });

  const uniqueVariantIds = unique_(variantIds);
  const products = getActiveProductsByIds_(uniqueVariantIds, productFieldsMeta, studioInfo, companyCtx);
  const productMap = {};
  products.forEach(p => { productMap[p.id] = p; });

  const packagingMap = getPackagingMap_(uniqueVariantIds, packagingFieldsMeta, companyCtx);
  const hebrewNameMap = getHebrewNameMap_(uniqueVariantIds, companyCtx);
  const wholesaleMap = loadWholesalePricelistMap_(wholesalePricelist.id, companyCtx);

  const allTagIds = unique_(
    collectMany2manyIds_(templates, TAGS_FIELD_NAME)
      .concat(collectMany2manyIds_(products, TAGS_FIELD_NAME))
  );
  const tagNamesById = getRelationNamesById_(studioInfo.relation, allTagIds, companyCtx);

  const allEcommerceIds = unique_(
    collectMany2manyIds_(templates, 'public_categ_ids')
      .concat(collectMany2manyIds_(products, 'public_categ_ids'))
  );
  const ecommerceNamesById = ecommerceInfo.relation
    ? getRelationNamesById_(ecommerceInfo.relation, allEcommerceIds, companyCtx)
    : {};

  const rows = [];

  products.forEach(p => {
    const templateId = Array.isArray(p.product_tmpl_id) ? p.product_tmpl_id[0] : '';
    const t = templateMap[templateId] || {};

    const internalRef = safeStr_(p.default_code);
    if (shouldIgnoreInternalReference_(internalRef, ignoredInternalReferencePatterns)) {
      return;
    }
    const productName = safeStr_(p.name) || safeStr_(t.name);
    const hebrewName = safeStr_(hebrewNameMap[p.id]);
    const productBarcode = safeStr_(p.barcode) || safeStr_(t.barcode);
    const salesPrice = getSalesPrice_(p, t);
    const wholesaleRule = getWholesaleRuleForProduct_(p, t, wholesaleMap);
    const wholesalePrice = getWholesalePriceFromRule_(wholesaleRule);
    const uom = Array.isArray(p.uom_id) && p.uom_id.length ? safeStr_(p.uom_id[1]) : '';
    const packaging = packagingMap[p.id] || { packaging: '', packagingUom: '', packagingBarcode: '' };
    const imageUrl = buildOdooImageUrl_(p.id);

    const productCategory =
      (Array.isArray(p.categ_id) && p.categ_id.length ? safeStr_(p.categ_id[1]) : '') ||
      (Array.isArray(t.categ_id) && t.categ_id.length ? safeStr_(t.categ_id[1]) : '');

    let tagIds = [];
    if (studioInfo.model === 'product.template') {
      tagIds = Array.isArray(t[TAGS_FIELD_NAME]) ? t[TAGS_FIELD_NAME] : [];
    } else if (studioInfo.model === 'product.product') {
      tagIds = Array.isArray(p[TAGS_FIELD_NAME]) ? p[TAGS_FIELD_NAME] : [];
    } else {
      tagIds = unique_(
        (Array.isArray(t[TAGS_FIELD_NAME]) ? t[TAGS_FIELD_NAME] : [])
          .concat(Array.isArray(p[TAGS_FIELD_NAME]) ? p[TAGS_FIELD_NAME] : [])
      );
    }

    const ecommerceIds = unique_(
      (Array.isArray(p.public_categ_ids) ? p.public_categ_ids : [])
        .concat(Array.isArray(t.public_categ_ids) ? t.public_categ_ids : [])
    );

    rows.push([
      internalRef,
      productName,
      hebrewName,
      String(productBarcode),
      uom,
      packaging.packaging,
      packaging.packagingUom,
      String(packaging.packagingBarcode),
      safeStr_(p.create_date),
      joinRelationNames_(tagIds, tagNamesById),
      productCategory,
      joinRelationNames_(ecommerceIds, ecommerceNamesById),
      salesPrice,
      wholesalePrice,
      imageUrl
    ]);
  });

  rows.sort(sortByRefThenName_);
  writeProductsTab_(rows);
}


function findPricelistByNameForCompany_(name, companyId, companyCtx) {
  const exactCompanyRows = executeKwCtx_(
    'product.pricelist',
    'search_read',
    [[
      ['name', '=', name],
      ['company_id', '=', companyId]
    ]],
    { fields: ['id', 'name', 'company_id'], limit: 1 },
    companyCtx
  ) || [];

  if (exactCompanyRows.length) return exactCompanyRows[0];

  const genericRows = executeKwCtx_(
    'product.pricelist',
    'search_read',
    [[
      ['name', '=', name],
      ['company_id', '=', false]
    ]],
    { fields: ['id', 'name', 'company_id'], limit: 1 },
    companyCtx
  ) || [];

  if (genericRows.length) return genericRows[0];

  const fallbackRows = executeKwCtx_(
    'product.pricelist',
    'search_read',
    [[['name', 'ilike', name]]],
    { fields: ['id', 'name', 'company_id'], limit: 10 },
    companyCtx
  ) || [];

  if (!fallbackRows.length) return null;

  const sameCompany = fallbackRows.find(r =>
    Array.isArray(r.company_id) && r.company_id.length && r.company_id[0] === companyId
  );
  if (sameCompany) return sameCompany;

  const noCompany = fallbackRows.find(r =>
    !r.company_id || !Array.isArray(r.company_id) || !r.company_id.length
  );
  return noCompany || fallbackRows[0];
}

function loadWholesalePricelistMap_(pricelistId, companyCtx) {
  const byProductId = {};
  const byTemplateId = {};

  const rows = executeKwCtx_(
    'product.pricelist.item',
    'search_read',
    [[['pricelist_id', '=', pricelistId]]],
    {
      fields: [
        'id',
        'applied_on',
        'product_id',
        'product_tmpl_id',
        'min_quantity',
        'compute_price',
        'fixed_price',
        'percent_price',
        'price_discount',
        'date_start',
        'date_end'
      ],
      order: 'applied_on asc,min_quantity asc,id asc',
      limit: 5000
    },
    companyCtx
  ) || [];

  rows.forEach(r => {
    const rule = {
      id: r.id,
      applied_on: safeStr_(r.applied_on),
      min_quantity: Number(r.min_quantity || 0),
      compute_price: safeStr_(r.compute_price),
      fixed_price: r.fixed_price,
      percent_price: r.percent_price,
      price_discount: r.price_discount,
      date_start: safeStr_(r.date_start),
      date_end: safeStr_(r.date_end)
    };

    if (Array.isArray(r.product_id) && r.product_id.length) {
      const productId = r.product_id[0];
      byProductId[productId] = chooseBetterWholesaleRule_(byProductId[productId], rule);
    } else if (Array.isArray(r.product_tmpl_id) && r.product_tmpl_id.length) {
      const templateId = r.product_tmpl_id[0];
      byTemplateId[templateId] = chooseBetterWholesaleRule_(byTemplateId[templateId], rule);
    }
  });

  return {
    byProductId: byProductId,
    byTemplateId: byTemplateId
  };
}

function chooseBetterWholesaleRule_(existing, candidate) {
  if (!existing) return candidate;

  const existingFixed = existing.compute_price === 'fixed';
  const candidateFixed = candidate.compute_price === 'fixed';

  if (candidateFixed && !existingFixed) return candidate;
  if (!candidateFixed && existingFixed) return existing;

  const existingActive = isRuleActiveToday_(existing);
  const candidateActive = isRuleActiveToday_(candidate);

  if (candidateActive && !existingActive) return candidate;
  if (!candidateActive && existingActive) return existing;

  if (candidate.min_quantity < existing.min_quantity) return candidate;
  if (candidate.min_quantity > existing.min_quantity) return existing;

  return candidate.id < existing.id ? candidate : existing;
}

function isRuleActiveToday_(rule) {
  const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  if (rule.date_start && rule.date_start > today) return false;
  if (rule.date_end && rule.date_end < today) return false;
  return true;
}

function getWholesaleRuleForProduct_(productRow, templateRow, wholesaleMap) {
  const productId = productRow && productRow.id ? productRow.id : null;
  const templateId =
    productRow && Array.isArray(productRow.product_tmpl_id) && productRow.product_tmpl_id.length
      ? productRow.product_tmpl_id[0]
      : (templateRow && templateRow.id ? templateRow.id : null);

  if (productId && wholesaleMap.byProductId[productId]) {
    return wholesaleMap.byProductId[productId];
  }
  if (templateId && wholesaleMap.byTemplateId[templateId]) {
    return wholesaleMap.byTemplateId[templateId];
  }
  return null;
}

function getWholesalePriceFromRule_(rule) {
  if (!rule) return '';
  if (rule.compute_price === 'fixed') {
    return priceToNumber_(rule.fixed_price);
  }
  return '';
}

function getActiveTemplatesForCompany_(companyId, templateFieldsMeta, studioInfo, companyCtx) {
  const fields = ['id', 'name', 'product_variant_ids', 'company_id'];
  if (fieldExists_(templateFieldsMeta, 'barcode')) fields.push('barcode');
  if (fieldExists_(templateFieldsMeta, 'list_price')) fields.push('list_price');
  if (fieldExists_(templateFieldsMeta, 'categ_id')) fields.push('categ_id');
  if (fieldExists_(templateFieldsMeta, 'public_categ_ids')) fields.push('public_categ_ids');
  if (studioInfo.model === 'product.template' && fieldExists_(templateFieldsMeta, TAGS_FIELD_NAME)) {
    fields.push(TAGS_FIELD_NAME);
  }

  const domain = [
    '&',
      ['active', '=', true],
      '|',
        ['company_id', '=', false],
        ['company_id', '=', companyId]
  ];

  return executeKwCtx_(
    'product.template',
    'search_read',
    [domain],
    { fields: unique_(fields), limit: 0, order: 'name,id' },
    companyCtx
  ) || [];
}

function getActiveProductsByIds_(productIds, productFieldsMeta, studioInfo, companyCtx) {
  if (!productIds || !productIds.length) return [];

  const fields = ['id', 'default_code', 'name', 'barcode', 'uom_id', 'create_date', 'product_tmpl_id', 'active'];
  if (fieldExists_(productFieldsMeta, 'standard_price')) fields.push('standard_price');
  if (fieldExists_(productFieldsMeta, 'lst_price')) fields.push('lst_price');
  if (fieldExists_(productFieldsMeta, 'categ_id')) fields.push('categ_id');
  if (fieldExists_(productFieldsMeta, 'public_categ_ids')) fields.push('public_categ_ids');
  if (studioInfo.model === 'product.product' && fieldExists_(productFieldsMeta, TAGS_FIELD_NAME)) {
    fields.push(TAGS_FIELD_NAME);
  }

  return executeKwCtx_(
    'product.product',
    'search_read',
    [[
      ['id', 'in', productIds],
      ['active', '=', true]
    ]],
    { fields: unique_(fields), limit: 0, order: 'default_code,name,id' },
    companyCtx
  ) || [];
}

function getHebrewNameMap_(productIds, companyCtx) {
  const out = {};
  if (!productIds || !productIds.length) return out;

  for (let i = 0; i < HEBREW_LANG_CANDIDATES.length; i++) {
    const lang = HEBREW_LANG_CANDIDATES[i];
    const rows = readInChunks_('product.product', productIds, ['id', 'name'], Object.assign({}, companyCtx || {}, { lang: lang }));
    rows.forEach(r => {
      out[r.id] = safeStr_(r.name);
    });
    if (Object.keys(out).length) return out;
  }

  return out;
}

function getPackagingMap_(productIds, packagingFieldsMeta, companyCtx) {
  const map = {};
  if (!productIds || !productIds.length) return map;

  const fields = ['id', 'product_id', 'barcode'];
  if (fieldExists_(packagingFieldsMeta, 'name')) fields.push('name');
  if (fieldExists_(packagingFieldsMeta, 'uom_id')) fields.push('uom_id');
  if (fieldExists_(packagingFieldsMeta, 'qty')) fields.push('qty');

  const rows = executeKwCtx_(
    'product.packaging',
    'search_read',
    [[['product_id', 'in', productIds]]],
    { fields: unique_(fields), limit: 0, order: 'product_id,qty,id' },
    companyCtx
  ) || [];

  rows.forEach(r => {
    const prod = Array.isArray(r.product_id) ? r.product_id : null;
    if (!prod || !prod.length) return;
    const productId = prod[0];

    if (!map[productId]) {
      map[productId] = {
        packagingParts: [],
        packagingUomParts: [],
        packagingBarcodeParts: []
      };
    }

    const packagingName = safeStr_(r.name);
    if (packagingName) addUniquePart_(map[productId].packagingParts, packagingName);

    let packagingUom = '';
    if (Array.isArray(r.uom_id) && r.uom_id.length) {
      packagingUom = safeStr_(r.uom_id[1]);
    } else if (r.qty != null && r.qty !== '') {
      packagingUom = String(r.qty);
    }
    if (packagingUom) addUniquePart_(map[productId].packagingUomParts, packagingUom);

    const packagingBarcode = safeStr_(r.barcode);
    if (packagingBarcode) addUniquePart_(map[productId].packagingBarcodeParts, packagingBarcode);
  });

  Object.keys(map).forEach(productId => {
    map[productId] = {
      packaging: map[productId].packagingParts.join(' | '),
      packagingUom: map[productId].packagingUomParts.join(' | '),
      packagingBarcode: map[productId].packagingBarcodeParts.join(' | ')
    };
  });

  return map;
}

function findStudioM2MField_(fieldName, companyCtx) {
  let ids = executeKwCtx_(
    'ir.model.fields',
    'search',
    [[['model', '=', 'product.template'], ['name', '=', fieldName]]],
    { limit: 1 },
    companyCtx
  ) || [];
  let model = 'product.template';

  if (!ids.length) {
    ids = executeKwCtx_(
      'ir.model.fields',
      'search',
      [[['model', '=', 'product.product'], ['name', '=', fieldName]]],
      { limit: 1 },
      companyCtx
    ) || [];
    if (ids.length) model = 'product.product';
  }

  if (!ids.length) return { exists: false };

  const infoRows = executeKwCtx_(
    'ir.model.fields',
    'read',
    [ids, ['model', 'name', 'ttype', 'relation', 'field_description']],
    {},
    companyCtx
  ) || [];

  const info = infoRows.length ? infoRows[0] : null;
  if (!info) return { exists: false };

  return {
    exists: true,
    model: safeStr_(info.model),
    relation: safeStr_(info.relation),
    isM2M: safeStr_(info.ttype) === 'many2many',
    label: safeStr_(info.field_description || fieldName)
  };
}

function getMany2manyFieldInfo_(productFieldsMeta, templateFieldsMeta, fieldName) {
  if (fieldExists_(productFieldsMeta, fieldName)) {
    return {
      model: 'product.product',
      relation: safeStr_(productFieldsMeta[fieldName].relation)
    };
  }
  if (fieldExists_(templateFieldsMeta, fieldName)) {
    return {
      model: 'product.template',
      relation: safeStr_(templateFieldsMeta[fieldName].relation)
    };
  }
  return { model: '', relation: '' };
}

function collectMany2manyIds_(rows, fieldName) {
  const ids = [];
  (rows || []).forEach(r => {
    const value = r && Array.isArray(r[fieldName]) ? r[fieldName] : [];
    value.forEach(id => {
      if (id) ids.push(id);
    });
  });
  return unique_(ids);
}

function getRelationNamesById_(relationModel, ids, companyCtx) {
  const out = {};
  if (!relationModel || !ids || !ids.length) return out;

  const uniq = unique_(ids.filter(Boolean));
  const chunks = chunkArray_(uniq, 200);

  chunks.forEach(chunk => {
    let pairs = [];
    try {
      pairs = executeKwCtx_(
        relationModel,
        'name_get',
        [chunk],
        {},
        companyCtx
      ) || [];
      pairs.forEach(pair => {
        if (Array.isArray(pair) && pair.length >= 2) {
          out[pair[0]] = safeStr_(pair[1]);
        }
      });
      if (pairs.length) return;
    } catch (e) {
      // fallback below
    }

    let rows = [];
    try {
      rows = executeKwCtx_(
        relationModel,
        'search_read',
        [[['id', 'in', chunk]]],
        { fields: ['id', 'display_name'], limit: 0 },
        companyCtx
      ) || [];
    } catch (e) {
      rows = executeKwCtx_(
        relationModel,
        'search_read',
        [[['id', 'in', chunk]]],
        { fields: ['id', 'name'], limit: 0 },
        companyCtx
      ) || [];
    }

    rows.forEach(r => {
      out[r.id] = safeStr_(r.display_name || r.name);
    });
  });

  return out;
}

function joinRelationNames_(ids, namesById) {
  if (!Array.isArray(ids) || !ids.length) return '';
  const parts = [];
  ids.forEach(id => {
    const name = safeStr_(namesById[id]);
    if (name) addUniquePart_(parts, name);
  });
  return parts.join(' | ');
}

function getSalesPrice_(productRow, templateRow) {
  if (productRow && productRow.lst_price != null && productRow.lst_price !== '') {
    return priceToNumber_(productRow.lst_price);
  }
  if (templateRow && templateRow.list_price != null && templateRow.list_price !== '') {
    return priceToNumber_(templateRow.list_price);
  }
  return 0;
}

function priceToNumber_(value) {
  if (value == null || value === '' || value === false) return '';
  const n = Number(value);
  return Number.isFinite(n) ? n : '';
}

function buildCompanyContext_(companyId) {
  return {
    allowed_company_ids: [companyId],
    company_id: companyId,
    force_company: companyId
  };
}

function buildOdooImageUrl_(productId) {
  const cfg = getConfig_();
  const base = cfg.ODOO_URL.replace(/\/+$/, '');
  return base + '/web/image/product.product/' + productId + '/image_128';
}

function writeProductsTab_(rows) {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(PRODUCTS_TAB_NAME);
  if (!sh) sh = ss.insertSheet(PRODUCTS_TAB_NAME);

  const headers = [
    'Internal Reference',
    'Product Name',
    'Product Name (Hebrew)',
    'Product Barcode',
    'UOM',
    'Packaging',
    'Packaging UOM',
    'Packaging Barcode',
    'Date Created',
    'Product Tags',
    'Product Category',
    'Ecommerce Category',
    'Sales Price',
    'Wholesale Price',
    'Image URL'
  ];

  sh.clearContents();
  sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  sh.getRange(1, 1, 1, headers.length)
    .setFontWeight('bold')
    .setBackground('#d9ead3')
    .setHorizontalAlignment('center')
    .setWrap(true);
  sh.setFrozenRows(1);

  // Preserve leading zeros in barcode columns and dates as text.
  sh.getRange('D:D').setNumberFormat('@');
  sh.getRange('H:H').setNumberFormat('@');
  sh.getRange('I:I').setNumberFormat('@');
  sh.getRange('M:N').setNumberFormat('0.00');

  if (rows.length) {
    sh.getRange(2, 1, rows.length, headers.length).setValues(rows);
    sh.getRange(2, 4, rows.length, 1).setNumberFormat('@');
    sh.getRange(2, 8, rows.length, 1).setNumberFormat('@');
    sh.getRange(2, 9, rows.length, 1).setNumberFormat('@');
    sh.getRange(2, 13, rows.length, 2).setNumberFormat('0.00');
  }

  try {
    const filter = sh.getFilter();
    if (filter) filter.remove();
  } catch (e) {}

  sh.getRange(1, 1, Math.max(rows.length + 1, 2), headers.length).createFilter();

  try { sh.autoResizeColumns(1, headers.length); } catch (e) {}

  sh.setColumnWidth(2, 260);
  sh.setColumnWidth(3, 260);
  sh.setColumnWidth(6, 220);
  sh.setColumnWidth(7, 180);
  sh.setColumnWidth(9, 170);
  sh.setColumnWidth(10, 240);
  sh.setColumnWidth(11, 220);
  sh.setColumnWidth(12, 220);
  sh.setColumnWidth(13, 140);
  sh.setColumnWidth(14, 140);
  sh.setColumnWidth(15, 320);
}

function readInChunks_(model, ids, fields, context) {
  const out = [];
  if (!ids || !ids.length) return out;

  const chunks = chunkArray_(ids, 200);
  chunks.forEach(chunk => {
    const kwargs = {};
    if (context) kwargs.context = context;

    const rows = executeKw(
      model,
      'read',
      [chunk, fields],
      kwargs
    ) || [];

    rows.forEach(r => out.push(r));
  });

  return out;
}

function getFieldsMeta_(model) {
  if (__FIELDS_META_CACHE[model]) return __FIELDS_META_CACHE[model];
  __FIELDS_META_CACHE[model] = executeKw(
    model,
    'fields_get',
    [],
    { attributes: ['string', 'type', 'relation'] }
  ) || {};
  return __FIELDS_META_CACHE[model];
}

function fieldExists_(fieldsMeta, fieldName) {
  return !!(fieldsMeta && fieldsMeta[fieldName]);
}

function sortByRefThenName_(a, b) {
  const ar = String(a[0] || '').toLowerCase();
  const br = String(b[0] || '').toLowerCase();
  if (ar < br) return -1;
  if (ar > br) return 1;

  const an = String(a[1] || '').toLowerCase();
  const bn = String(b[1] || '').toLowerCase();
  return an.localeCompare(bn);
}

function addUniquePart_(arr, value) {
  const v = safeStr_(value);
  if (!v) return;
  if (arr.indexOf(v) === -1) arr.push(v);
}

function unique_(arr) {
  const out = [];
  const seen = {};
  (arr || []).forEach(v => {
    const key = String(v);
    if (seen[key]) return;
    seen[key] = true;
    out.push(v);
  });
  return out;
}

function chunkArray_(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

/* config/auth pattern kept from the original script */

function getIgnoredInternalReferencePatterns_() {
  const sh = SpreadsheetApp.getActive().getSheetByName(CONFIG_TAB_NAME);
  if (!sh) throw new Error('Config sheet "config" not found.');

  return sh.getRange(IGNORE_INTERNAL_REFERENCES_RANGE)
    .getValues()
    .flat()
    .map(v => safeStr_(v).toLowerCase())
    .filter(Boolean);
}

function shouldIgnoreInternalReference_(internalRef, patterns) {
  const ref = safeStr_(internalRef).toLowerCase();
  if (!ref) return false;
  if (!patterns || !patterns.length) return false;

  return patterns.some(pattern => ref.indexOf(pattern) !== -1);
}

function getConfig_() {
  if (__CFG_CACHE) return __CFG_CACHE;
  const sh = SpreadsheetApp.getActive().getSheetByName(CONFIG_TAB_NAME);
  if (!sh) throw new Error('Config sheet "config" not found.');

  const vals = sh.getRange('B1:B4').getValues().map(r => r[0]);
  __CFG_CACHE = {
    ODOO_URL: String(vals[0] || '').trim(),
    ODOO_DB: String(vals[1] || '').trim(),
    ODOO_USER_EMAIL: String(vals[2] || '').trim(),
    ODOO_API_KEY: String(vals[3] || '').trim()
  };
  return __CFG_CACHE;
}

function jsonrpc(params) {
  const cfg = getConfig_();
  const body = { jsonrpc: '2.0', method: 'call', params: params, id: Date.now() };

  const resp = UrlFetchApp.fetch(cfg.ODOO_URL.replace(/\/+$/,'') + '/jsonrpc', {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(body)
  });

  const text = resp.getContentText();
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    throw new Error('JSON-RPC parse error: ' + text.slice(0, 300));
  }

  if (data.error) throw new Error('Odoo error: ' + JSON.stringify(data.error));
  return data.result;
}

function getUid() {
  if (__UID_CACHE) return __UID_CACHE;
  const cfg = getConfig_();

  const uid = jsonrpc({
    service: 'common',
    method: 'authenticate',
    args: [cfg.ODOO_DB, cfg.ODOO_USER_EMAIL, cfg.ODOO_API_KEY, {}]
  });

  if (!uid && uid !== 0) throw new Error('Authentication failed.');
  __UID_CACHE = uid;
  return uid;
}

function executeKw(model, method, args, kwargs) {
  const cfg = getConfig_();
  return jsonrpc({
    service: 'object',
    method: 'execute_kw',
    args: [cfg.ODOO_DB, getUid(), cfg.ODOO_API_KEY, model, method, args || [], kwargs || {}]
  });
}

function executeKwCtx_(model, method, args, kwargs, context) {
  const finalKwargs = Object.assign({}, kwargs || {});
  if (context) {
    finalKwargs.context = Object.assign({}, finalKwargs.context || {}, context);
  }
  return executeKw(model, method, args || [], finalKwargs);
}

function findCompanyByName_(name) {
  const rows = executeKw(
    'res.company',
    'search_read',
    [[['name', '=', name]]],
    { fields: ['id', 'name'], limit: 1 }
  );
  return rows && rows.length ? rows[0] : null;
}

function safeStr_(v) {
  return v == null ? '' : String(v).trim();
}
