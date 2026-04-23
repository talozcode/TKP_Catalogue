import jsPDF from 'jspdf';
import autoTable, { CellHookData } from 'jspdf-autotable';
import type {
  CatalogueItem,
  ColumnsVisibility,
  ExportMode,
  Product
} from './types';
import { resolveColumns, cellText } from './columns';

const LOGO_URL =
  'https://res.cloudinary.com/dakhwegyt/image/upload/v1776678465/kp-primary_4x_totp25.png';

const BRAND  = [122, 31, 61] as const;
const GOLD   = [201, 161, 78] as const;
const INK    = [26, 15, 18] as const;
const MUTED  = [122, 107, 111] as const;
const ROW    = [251, 247, 244] as const;
const LINE   = [234, 227, 223] as const;

type ExportArgs = {
  catalogueName: string;
  notes: string;
  items: CatalogueItem[];
  productByKey: Map<string, Product>;
  defaultDiscountPercent: number;
  showDiscountColumn: boolean;
  columns: ColumnsVisibility;
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
    exportMode: args.exportMode
  });
  const includeImages = cols.some((c) => c.id === 'image');

  const imageMap = new Map<string, ImageData | null>();
  const tasks: Promise<unknown>[] = [];
  const logoPromise = fetchImageAsData(LOGO_URL);
  tasks.push(logoPromise);

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

  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 36;

  const headerBottom = drawDocHeader(doc, args, logo, pageW, margin);

  const head = cols.map((c) => c.label);
  const body = args.items.map((it) => {
    const p = args.productByKey.get(it.productKey);
    return cols.map((c) => {
      if (c.id === 'image') return '';
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
      s.minCellHeight = 48;
      s.halign = 'center';
      s.valign = 'middle';
    }
    if (c.id === 'productName') s.fontStyle = 'bold';
    if (c.id === 'salesPrice' || c.id === 'finalPrice') s.fontStyle = 'bold';
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
    didDrawCell: (data: CellHookData) => {
      if (data.section !== 'body') return;
      const col = cols[data.column.index];
      if (!col || col.id !== 'image') return;
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
        doc.addImage(img.dataUrl, imgFormat(img.dataUrl), x, y, w, h, undefined, 'FAST');
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
        `The Kosher Place · ${args.catalogueName || 'Catalogue'}`,
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

  const safeName = (args.catalogueName || 'catalogue').replace(/[^a-z0-9-_]+/gi, '_');
  doc.save(`${safeName}.pdf`);
}

function drawDocHeader(
  doc: jsPDF,
  args: ExportArgs,
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
  doc.text(args.catalogueName || 'Catalogue', titleX, top + 22);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(GOLD[0], GOLD[1], GOLD[2]);
  const meta = [
    `${args.items.length} items`,
    `${args.exportMode} mode`,
    args.showDiscountColumn && args.defaultDiscountPercent > 0
      ? `${args.defaultDiscountPercent}% discount`
      : null,
    new Date().toLocaleDateString()
  ].filter(Boolean) as string[];
  doc.text(meta.join('  ·  ').toUpperCase(), titleX, top + 36);

  let bottom = Math.max(logoBottom, top + 42);

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
