/**
 * Reads the Products sheet by header name and returns a stable shape the
 * frontend can rely on regardless of column order.
 */
function getProducts(_params) {
  var rows = readAll_(SHEETS.PRODUCTS);
  var products = rows.map(mapProductRow_).filter(function (p) {
    // Drop fully-empty rows.
    return p.internalReference || p.productName || p.barcode;
  });
  return {
    products: products,
    lastSyncedAt: getMetadataValue_('last_synced_at'),
    count: products.length
  };
}

function mapProductRow_(r) {
  var dateCreated = r['Date Created'];
  if (dateCreated instanceof Date) dateCreated = dateCreated.toISOString();

  var tags = splitTags_(r['Product Tags']);

  return {
    internalReference: str_(r['Internal Reference']),
    productName:       str_(r['Product Name']),
    productNameHe:     str_(r['Product Name (Hebrew)']),
    barcode:           str_(r['Product Barcode']),
    uom:               str_(r['UOM']),
    packaging:         str_(r['Packaging']),
    packagingUom:      str_(r['Packaging UOM']),
    packagingBarcode:  str_(r['Packaging Barcode']),
    dateCreated:       dateCreated || '',
    tags:              tags,
    productCategory:   str_(r['Product Category']),
    ecommerceCategory: str_(r['Ecommerce Category']),
    salesPrice:        num_(r['Sales Price']),
    wholesalePrice:    num_(r['Wholesale Price']),
    imageUrl:          str_(r['Image URL'])
  };
}

function str_(v) { return v == null ? '' : String(v); }
function num_(v) {
  if (v === '' || v == null) return null;
  var n = Number(v);
  return isFinite(n) ? n : null;
}

function getMetadata(_params) {
  return {
    lastSyncedAt: getMetadataValue_('last_synced_at')
  };
}
