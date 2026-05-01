import jsPDF from 'jspdf';
import autoTable, { CellHookData } from 'jspdf-autotable';
import type {
  CatalogueItem,
  ColumnKey,
  ColumnsVisibility,
  ExportMode,
  Product
} from './types';
import { resolveColumns, cellText } from './columns';
import { displayCatalogueName, fileBaseName } from './catalogue-name';

const LOGO_URL =
  'https://res.cloudinary.com/dakhwegyt/image/upload/v1776678465/kp-primary_4x_totp25.png';

// jsPDF's built-in fonts have no Hebrew glyphs. We bundle Open Sans Hebrew
// Regular (Google Fonts, Apache 2.0) under /public/fonts so the load is
// same-origin — no CDN flakiness, no CORS. Hebrew cells are drawn manually
// with jsPDF's R2L mode enabled so words read in the correct order.
const HEBREW_FONT_URL = '/fonts/Hebrew-Regular.ttf';
const HEBREW_FONT_NAME = 'Hebrew';

async function fetchFontBase64(url: string): Promise<string | null> {
  try {
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const buf = await resp.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let bin = '';
    for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  } catch {
    return null;
  }
}

const BRAND  = [122, 31, 61] as const;
const GOLD   = [201, 161, 78] as const;
const INK    = [26, 15, 18] as const;
const MUTED  = [122, 107, 111] as const;
const ROW    = [251, 247, 244] as const;
const LINE   = [234, 227, 223] as const;

type ExportArgs = {
  catalogueName: string;
  titleDate: string;
  notes: string;
  items: CatalogueItem[];
  productByKey: Map<string, Product>;
  defaultDiscountPercent: number;
  showDiscountColumn: boolean;
  columns: ColumnsVisibility;
  columnsOrder: ColumnKey[];
  exportMode: ExportMode;
};

type ImageData = { dataUrl: string; w: number; h: number };

async function fetchImageAsData(url: string, timeoutMs = 6000): Promise<ImageData | null> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    const resp = await fetch(url, { mode: 'cors', signal: ctrl.signal });
    clearTimeout(timer);
    if (!resp.ok) return null;
    const blob = await resp.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = () => reject(new Error('read'));
      r.readAsDataURL(blob);
    });
    const dim = await new Promise<{ w: number; h: number }>((resolve) => {
      const img = new Image();
      img.onload = () =>
        resolve({ w: img.naturalWidth || 1, h: img.naturalHeight || 1 });
      img.onerror = () => resolve({ w: 1, h: 1 });
      img.src = dataUrl;
    });
    return { dataUrl, w: dim.w, h: dim.h };
  } catch {
    return null;
  }
}

function imgFormat(dataUrl: string): 'PNG' | 'JPEG' | 'WEBP' {
  if (dataUrl.startsWith('data:image/png')) return 'PNG';
  if (dataUrl.startsWith('data:image/webp')) return 'WEBP';
  return 'JPEG';
}

export async function exportToPdf(args: ExportArgs) {
  const cols = resolveColumns({
    columns: args.columns,
    showDiscountColumn: args.showDiscountColumn,
    exportMode: args.exportMode,
    order: args.columnsOrder
  });
  const docName = displayCatalogueName(args.catalogueName, args.titleDate);
  const includeImages = cols.some((c) => c.id === 'image');

  const includeHebrew = cols.some((c) => c.id === 'productNameHe');

  const imageMap = new Map<string, ImageData | null>();
  const tasks: Promise<unknown>[] = [];
  const logoPromise = fetchImageAsData(LOGO_URL);
  tasks.push(logoPromise);
  const hebrewFontPromise: Promise<string | null> = includeHebrew
    ? fetchFontBase64(HEBREW_FONT_URL)
    : Promise.resolve(null);
  tasks.push(hebrewFontPromise);

  if (includeImages) {
    const seen = new Set<string>();
    for (const it of args.items) {
      const p = args.productByKey.get(it.productKey);
      if (!p?.imageUrl || seen.has(p.imageUrl)) continue;
      seen.add(p.imageUrl);
      const url = p.imageUrl;
      tasks.push(fetchImageAsData(url).then((d) => imageMap.set(url, d)));
    }
  }
  await Promise.all(tasks);
  const logo = await logoPromise;
  const hebrewFontBase64 = await hebrewFontPromise;

  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 36;

  let hebrewFontReady = false;
  if (hebrewFontBase64) {
    try {
      doc.addFileToVFS('Hebrew-Regular.ttf', hebrewFontBase64);
      doc.addFont('Hebrew-Regular.ttf', HEBREW_FONT_NAME, 'normal');
      hebrewFontReady = true;
    } catch {
      // If font registration fails (jsPDF parse error etc.) fall back to the
      // default font — Hebrew glyphs will render as boxes but the export still
      // succeeds for the rest of the document.
    }
  }

  const headerBottom = drawDocHeader(doc, args, docName, logo, pageW, margin);

  const head = cols.map((c) => c.label);
  const body = args.items.map((it) => {
    const p = args.productByKey.get(it.productKey);
    return cols.map((c) => {
      if (c.id === 'image') return '';
      // Hebrew cells are drawn manually in didDrawCell so we can flip jsPDF
      // into R2L mode just for that draw call. Pass the raw value through
      // the body so autoTable still sizes the cell correctly.
      return cellText(c.id, {
        product: p,
        item: it,
        defaultDiscountPercent: args.defaultDiscountPercent
      });
    });
  });

  const columnStyles: Record<number, Record<string, unknown>> = {};
  cols.forEach((c, idx) => {
    const s: Record<string, unknown> = {};
    if (c.pdfWidth) s.cellWidth = c.pdfWidth;
    if (c.align === 'right') s.halign = 'right';
    if (c.align === 'center') s.halign = 'center';
    if (c.id === 'image') {
      s.minCellHeight = 80;
      s.halign = 'center';
      s.valign = 'middle';
      s.cellPadding = 3;
    }
    if (c.id === 'productName') s.fontStyle = 'bold';
    if (c.id === 'salesPrice' || c.id === 'finalPrice') s.fontStyle = 'bold';
    if (c.id === 'productNameHe' && hebrewFontReady) {
      s.font = HEBREW_FONT_NAME;
      s.halign = 'right';
    }
    columnStyles[idx] = s;
  });

  autoTable(doc, {
    head: [head],
    body,
    startY: headerBottom + 8,
    margin: { left: margin, right: margin, bottom: 44 },
    styles: {
      fontSize: 9,
      cellPadding: 6,
      lineColor: [LINE[0], LINE[1], LINE[2]],
      lineWidth: 0.4,
      textColor: [INK[0], INK[1], INK[2]]
    },
    headStyles: {
      fillColor: [BRAND[0], BRAND[1], BRAND[2]],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'left',
      cellPadding: 7,
      fontSize: 9
    },
    alternateRowStyles: { fillColor: [ROW[0], ROW[1], ROW[2]] },
    columnStyles,
    willDrawCell: (data: CellHookData) => {
      // Suppress autoTable's default text drawing for Hebrew cells — we draw
      // them ourselves in didDrawCell with R2L mode so the words read in the
      // correct order.
      if (data.section !== 'body') return;
      const col = cols[data.column.index];
      if (col?.id === 'productNameHe' && hebrewFontReady) {
        data.cell.text = [];
      }
    },
    didDrawCell: (data: CellHookData) => {
      if (data.section !== 'body') return;
      const col = cols[data.column.index];
      if (!col) return;

      if (col.id === 'productNameHe' && hebrewFontReady) {
        const it = args.items[data.row.index];
        if (!it) return;
        const p = args.productByKey.get(it.productKey);
        const text = p?.productNameHe || '';
        if (!text) return;
        const cell = data.cell;
        const pad = 6;
        doc.setFont(HEBREW_FONT_NAME, 'normal');
        doc.setFontSize(9);
        doc.setTextColor(INK[0], INK[1], INK[2]);
        const prevR2L = doc.getR2L ? doc.getR2L() : false;
        doc.setR2L(true);
        // R2L mode + halign:'right' anchors the text at the cell's right edge
        // and lays glyphs out right-to-left, so multi-word Hebrew reads in the
        // expected order.
        doc.text(text, cell.x + cell.width - pad, cell.y + cell.height / 2 + 3, {
          align: 'right',
          baseline: 'alphabetic'
        });
        doc.setR2L(prevR2L);
        return;
      }

      if (col.id !== 'image') return;
      const it = args.items[data.row.index];
      if (!it) return;
      const p = args.productByKey.get(it.productKey);
      if (!p?.imageUrl) return;
      const img = imageMap.get(p.imageUrl);
      if (!img) return;

      const cell = data.cell;
      const pad = 3;
      const maxW = cell.width - pad * 2;
      const maxH = cell.height - pad * 2;
      const ratio = img.w / img.h;
      let w = maxW;
      let h = w / ratio;
      if (h > maxH) {
        h = maxH;
        w = h * ratio;
      }
      const x = cell.x + (cell.width - w) / 2;
      const y = cell.y + (cell.height - h) / 2;
      try {
        doc.addImage(img.dataUrl, imgFormat(img.dataUrl), x, y, w, h, undefined, 'NONE');
      } catch {
        // Skip silently — image format unsupported by jsPDF.
      }
    },
    didDrawPage: () => {
      const total = doc.getNumberOfPages();
      const current = doc.getCurrentPageInfo().pageNumber;
      // Gold rule above the footer.
      doc.setDrawColor(GOLD[0], GOLD[1], GOLD[2]);
      doc.setLineWidth(0.6);
      doc.line(margin, pageH - 30, pageW - margin, pageH - 30);
      doc.setFontSize(8);
      doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `The Kosher Place · ${docName}`,
        margin,
        pageH - 18
      );
      doc.text(
        `Page ${current} of ${total}`,
        pageW - margin,
        pageH - 18,
        { align: 'right' }
      );
    }
  });

  doc.save(`${fileBaseName(args.catalogueName)}.pdf`);
}

function drawDocHeader(
  doc: jsPDF,
  args: ExportArgs,
  docName: string,
  logo: ImageData | null,
  pageW: number,
  margin: number
): number {
  const top = margin;
  let logoBottom = top;
  let titleX = margin;

  if (logo) {
    const targetH = 38;
    const ratio = logo.w / logo.h;
    const w = targetH * ratio;
    try {
      doc.addImage(
        logo.dataUrl,
        imgFormat(logo.dataUrl),
        margin,
        top,
        w,
        targetH,
        undefined,
        'FAST'
      );
      logoBottom = top + targetH;
      titleX = margin + w + 16;
    } catch {
      // If the logo can't be embedded, the catalogue title still anchors at the left.
    }
  }

  doc.setFont('times', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(BRAND[0], BRAND[1], BRAND[2]);
  doc.text(docName, titleX, top + 22);

  let bottom = Math.max(logoBottom, top + 30);
  if (args.showDiscountColumn && args.defaultDiscountPercent > 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(GOLD[0], GOLD[1], GOLD[2]);
    doc.text(
      `${args.defaultDiscountPercent}% DISCOUNT`,
      titleX,
      top + 36
    );
    bottom = Math.max(bottom, top + 42);
  }

  if (args.notes) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(INK[0], INK[1], INK[2]);
    const lines = doc.splitTextToSize(args.notes, pageW - margin * 2) as string[];
    doc.text(lines, margin, bottom + 16);
    bottom += 16 + lines.length * 11;
  }

  // Brand rule
  doc.setDrawColor(BRAND[0], BRAND[1], BRAND[2]);
  doc.setLineWidth(2);
  doc.line(margin, bottom + 10, pageW - margin, bottom + 10);
  // Gold accent
  doc.setDrawColor(GOLD[0], GOLD[1], GOLD[2]);
  doc.setLineWidth(0.8);
  doc.line(margin, bottom + 12.5, margin + 70, bottom + 12.5);

  return bottom + 16;
}
