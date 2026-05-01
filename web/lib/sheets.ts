import { google, sheets_v4 } from 'googleapis';
import { randomUUID } from 'crypto';

export const SHEETS = {
  PRODUCTS: 'Products',
  CATALOGUES: 'Catalogues',
  ITEMS: 'Catalogue_Items',
  SOURCES: 'Catalogue_Sources',
  METADATA: 'App_Metadata'
} as const;

export type SheetName = (typeof SHEETS)[keyof typeof SHEETS];

let cachedClient: sheets_v4.Sheets | null = null;
let cachedSheetIds: Record<string, number> | null = null;

function getEnv(): { email: string; key: string; sheetId: string } {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const sheetId = process.env.GOOGLE_SHEET_ID;
  let key = process.env.GOOGLE_PRIVATE_KEY;
  if (!email || !key || !sheetId) {
    throw new Error(
      'Missing GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, or GOOGLE_SHEET_ID'
    );
  }
  key = normalizePrivateKey(key);
  return { email, key, sheetId };
}

function normalizePrivateKey(raw: string): string {
  let k = raw.trim();
  // Strip surrounding quotes if the value was pasted with JSON quoting.
  if ((k.startsWith('"') && k.endsWith('"')) || (k.startsWith("'") && k.endsWith("'"))) {
    k = k.slice(1, -1);
  }
  // Vercel sometimes stores newlines as the literal string "\n" — convert back.
  k = k.replace(/\\n/g, '\n');
  if (!k.endsWith('\n')) k += '\n';
  return k;
}

export function spreadsheetId(): string {
  return getEnv().sheetId;
}

export function sheetsClient(): sheets_v4.Sheets {
  if (cachedClient) return cachedClient;
  const { email, key } = getEnv();
  const auth = new google.auth.JWT({
    email,
    key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
  cachedClient = google.sheets({ version: 'v4', auth });
  return cachedClient;
}

function quote(name: string): string {
  // Apostrophes in sheet names are escaped by doubling them.
  return `'${name.replace(/'/g, "''")}'`;
}

async function loadSheetIds(force = false): Promise<Record<string, number>> {
  if (cachedSheetIds && !force) return cachedSheetIds;
  const api = sheetsClient();
  const meta = await api.spreadsheets.get({
    spreadsheetId: spreadsheetId(),
    fields: 'sheets(properties(sheetId,title))'
  });
  const map: Record<string, number> = {};
  for (const s of meta.data.sheets || []) {
    const t = s.properties?.title;
    const id = s.properties?.sheetId;
    if (t && id != null) map[t] = id;
  }
  cachedSheetIds = map;
  return map;
}

export async function getSheetId(name: string): Promise<number> {
  const map = await loadSheetIds();
  if (map[name] != null) return map[name];
  const refreshed = await loadSheetIds(true);
  if (refreshed[name] == null) throw new Error(`Sheet not found: ${name}`);
  return refreshed[name];
}

export async function ensureSheet(name: string, headers: string[]): Promise<void> {
  const map = await loadSheetIds();
  if (map[name] != null) return;
  const api = sheetsClient();
  await api.spreadsheets.batchUpdate({
    spreadsheetId: spreadsheetId(),
    requestBody: {
      requests: [{ addSheet: { properties: { title: name } } }]
    }
  });
  await api.spreadsheets.values.update({
    spreadsheetId: spreadsheetId(),
    range: `${quote(name)}!A1`,
    valueInputOption: 'RAW',
    requestBody: { values: [headers] }
  });
  cachedSheetIds = null;
}

export type RawRow = Record<string, unknown> & {
  /** Original cell values keyed by 0-based column index, for positional fallbacks. */
  __cells?: unknown[];
};

export async function readAll(name: string): Promise<RawRow[]> {
  const { rows } = await readAllWithHeaders(name);
  return rows;
}

export async function readAllWithHeaders(
  name: string
): Promise<{ headers: string[]; rows: RawRow[] }> {
  const api = sheetsClient();
  const res = await api.spreadsheets.values.get({
    spreadsheetId: spreadsheetId(),
    range: quote(name),
    valueRenderOption: 'UNFORMATTED_VALUE',
    dateTimeRenderOption: 'FORMATTED_STRING'
  });
  const values = res.data.values || [];
  if (values.length < 2) return { headers: values[0]?.map((h) => String(h ?? '').trim()) || [], rows: [] };
  const headers = values[0].map((h) => String(h ?? '').trim());
  const rows: RawRow[] = [];
  for (let r = 1; r < values.length; r++) {
    const row = values[r];
    const obj: RawRow = { __cells: row };
    for (let c = 0; c < headers.length; c++) {
      const h = headers[c];
      if (h) obj[h] = row[c];
    }
    rows.push(obj);
  }
  return { headers, rows };
}

async function getHeaders(name: string): Promise<string[]> {
  const api = sheetsClient();
  const res = await api.spreadsheets.values.get({
    spreadsheetId: spreadsheetId(),
    range: `${quote(name)}!1:1`
  });
  const row = res.data.values?.[0] || [];
  return row.map((h) => String(h ?? '').trim());
}

function rowFromHeaders(headers: string[], obj: Record<string, unknown>): unknown[] {
  return headers.map((h) => (h && h in obj ? (obj[h] ?? '') : ''));
}

export async function appendByHeaders(
  name: string,
  obj: Record<string, unknown>
): Promise<void> {
  const headers = await getHeaders(name);
  const api = sheetsClient();
  await api.spreadsheets.values.append({
    spreadsheetId: spreadsheetId(),
    range: quote(name),
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [rowFromHeaders(headers, obj)] }
  });
}

export async function appendManyByHeaders(
  name: string,
  objs: Record<string, unknown>[]
): Promise<void> {
  if (!objs.length) return;
  const headers = await getHeaders(name);
  const api = sheetsClient();
  await api.spreadsheets.values.append({
    spreadsheetId: spreadsheetId(),
    range: quote(name),
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: objs.map((o) => rowFromHeaders(headers, o)) }
  });
}

export async function updateRowByHeaders(
  name: string,
  rowIndex0Based: number,
  obj: Record<string, unknown>
): Promise<void> {
  const headers = await getHeaders(name);
  const api = sheetsClient();
  // rowIndex0Based 0 means the first data row (i.e. spreadsheet row 2).
  const rowNumber = rowIndex0Based + 2;
  await api.spreadsheets.values.update({
    spreadsheetId: spreadsheetId(),
    range: `${quote(name)}!A${rowNumber}`,
    valueInputOption: 'RAW',
    requestBody: { values: [rowFromHeaders(headers, obj)] }
  });
}

export async function deleteRowsWhere(
  name: string,
  keyHeader: string,
  keyValue: string
): Promise<number> {
  const api = sheetsClient();
  const res = await api.spreadsheets.values.get({
    spreadsheetId: spreadsheetId(),
    range: quote(name),
    valueRenderOption: 'UNFORMATTED_VALUE'
  });
  const values = res.data.values || [];
  if (values.length < 2) return 0;
  const headers = values[0].map((h) => String(h ?? '').trim());
  const idx = headers.indexOf(keyHeader);
  if (idx < 0) throw new Error(`Header missing: ${keyHeader}`);

  const sheetId = await getSheetId(name);
  const requests: sheets_v4.Schema$Request[] = [];
  for (let r = values.length - 1; r >= 1; r--) {
    if (String(values[r][idx] ?? '') === String(keyValue)) {
      requests.push({
        deleteDimension: {
          range: {
            sheetId,
            dimension: 'ROWS',
            startIndex: r,
            endIndex: r + 1
          }
        }
      });
    }
  }
  if (!requests.length) return 0;
  await api.spreadsheets.batchUpdate({
    spreadsheetId: spreadsheetId(),
    requestBody: { requests }
  });
  return requests.length;
}

export async function getMetadataValue(key: string): Promise<string | null> {
  const rows = await readAll(SHEETS.METADATA);
  for (const r of rows) {
    if (String(r.key) === key) return r.value == null ? null : String(r.value);
  }
  return null;
}

export async function setMetadata(key: string, value: string): Promise<void> {
  const rows = await readAll(SHEETS.METADATA);
  for (let i = 0; i < rows.length; i++) {
    if (String(rows[i].key) === key) {
      await updateRowByHeaders(SHEETS.METADATA, i, { key, value });
      return;
    }
  }
  await appendByHeaders(SHEETS.METADATA, { key, value });
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function newId(): string {
  return randomUUID();
}

export function str(v: unknown): string {
  return v == null ? '' : String(v);
}

export function num(v: unknown): number | null {
  if (v === '' || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function truthy(v: unknown): boolean {
  if (v === true) return true;
  if (typeof v === 'string') return /^(true|1|yes|y)$/i.test(v.trim());
  if (typeof v === 'number') return v !== 0;
  return !!v;
}

export function splitTags(value: unknown): string[] {
  if (value == null) return [];
  return String(value)
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}
