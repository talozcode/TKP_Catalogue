import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  AddedBySource,
  Catalogue,
  CatalogueItem,
  CatalogueSource,
  ColumnKey,
  ColumnsVisibility,
  ExportMode
} from './types';
import { DEFAULT_COLUMN_ORDER, normalizeColumnOrder } from './columns';

// Keep the working catalogue in memory (and a draft copy in localStorage so a
// reload doesn't lose unsaved work). Saved catalogues live on the server.

type CatalogueState = {
  catalogueId: string | null;
  catalogueName: string;
  notes: string;
  titleDate: string;
  defaultDiscountPercent: number;
  showDiscountColumn: boolean;
  exportMode: ExportMode;
  columnsVisibility: ColumnsVisibility;
  columnsOrder: ColumnKey[];
  items: CatalogueItem[];
  sources: CatalogueSource[];

  // mutations
  setMeta: (m: Partial<Pick<Catalogue, 'catalogueName' | 'notes' | 'titleDate' | 'defaultDiscountPercent' | 'showDiscountColumn' | 'exportMode' | 'columnsVisibility' | 'columnsOrder'>>) => void;
  addProduct: (productKey: string, source: AddedBySource) => void;
  addManyProducts: (keys: string[], source: AddedBySource) => void;
  removeProduct: (productKey: string) => void;
  toggleExclude: (productKey: string) => void;
  setNote: (productKey: string, note: string) => void;
  reorder: (fromIdx: number, toIdx: number) => void;
  addSource: (sourceType: 'category' | 'tag', sourceValue: string) => void;
  removeSource: (sourceType: 'category' | 'tag', sourceValue: string) => void;
  toggleColumn: (key: keyof ColumnsVisibility) => void;
  setColumnsOrder: (order: ColumnKey[]) => void;
  moveColumn: (fromIdx: number, toIdx: number) => void;
  clear: () => void;
  loadFromServer: (catalogue: Catalogue, items: CatalogueItem[], sources: CatalogueSource[]) => void;
  setSavedId: (id: string) => void;
};

const DEFAULT_COLUMNS: ColumnsVisibility = {
  image: true,
  internalReference: true,
  productName: true,
  barcode: false,
  uom: false,
  packaging: false,
  category: true,
  tags: false,
  salesPrice: true,
  wholesalePrice: false,
  discount: false,
  finalPrice: false,
  note: false
};

function emptyState() {
  return {
    catalogueId: null as string | null,
    catalogueName: '',
    notes: '',
    titleDate: '',
    defaultDiscountPercent: 0,
    showDiscountColumn: false,
    exportMode: 'customer' as ExportMode,
    columnsVisibility: { ...DEFAULT_COLUMNS },
    columnsOrder: [...DEFAULT_COLUMN_ORDER] as ColumnKey[],
    items: [] as CatalogueItem[],
    sources: [] as CatalogueSource[]
  };
}

export const useCatalogue = create<CatalogueState>()(
  persist(
    (set, get) => ({
      ...emptyState(),

      setMeta: (m) => set((s) => ({ ...s, ...m })),

      addProduct: (productKey, source) => {
        const items = get().items;
        // If it was previously removed, un-remove it; otherwise append.
        const idx = items.findIndex((i) => i.productKey === productKey);
        if (idx >= 0) {
          const next = [...items];
          next[idx] = { ...next[idx], manuallyRemoved: false };
          set({ items: next });
          return;
        }
        set({
          items: [
            ...items,
            {
              productKey,
              selectedOrder: items.length,
              excludedFromDiscount: false,
              customNote: '',
              manuallyRemoved: false,
              addedBySource: source
            }
          ]
        });
      },

      addManyProducts: (keys, source) => {
        const items = [...get().items];
        const have = new Set(items.map((i) => i.productKey));
        for (const k of keys) {
          if (have.has(k)) {
            const idx = items.findIndex((i) => i.productKey === k);
            if (idx >= 0 && items[idx].manuallyRemoved) {
              items[idx] = { ...items[idx], manuallyRemoved: false };
            }
            continue;
          }
          items.push({
            productKey: k,
            selectedOrder: items.length,
            excludedFromDiscount: false,
            customNote: '',
            manuallyRemoved: false,
            addedBySource: source
          });
          have.add(k);
        }
        set({ items });
      },

      // We mark as manuallyRemoved (instead of splicing) so that re-loading a
      // category source doesn't silently re-add a product the user removed.
      removeProduct: (productKey) => {
        const items = get().items.map((i) =>
          i.productKey === productKey ? { ...i, manuallyRemoved: true } : i
        );
        set({ items });
      },

      toggleExclude: (productKey) => {
        const items = get().items.map((i) =>
          i.productKey === productKey ? { ...i, excludedFromDiscount: !i.excludedFromDiscount } : i
        );
        set({ items });
      },

      setNote: (productKey, note) => {
        const items = get().items.map((i) =>
          i.productKey === productKey ? { ...i, customNote: note } : i
        );
        set({ items });
      },

      reorder: (fromIdx, toIdx) => {
        const visible = get().items.filter((i) => !i.manuallyRemoved);
        if (fromIdx < 0 || toIdx < 0 || fromIdx >= visible.length || toIdx >= visible.length) return;
        const moved = visible.splice(fromIdx, 1)[0];
        visible.splice(toIdx, 0, moved);
        const removed = get().items.filter((i) => i.manuallyRemoved);
        const next = [...visible, ...removed].map((i, idx) => ({ ...i, selectedOrder: idx }));
        set({ items: next });
      },

      addSource: (sourceType, sourceValue) => {
        const exists = get().sources.some(
          (s) => s.sourceType === sourceType && s.sourceValue.toLowerCase() === sourceValue.toLowerCase()
        );
        if (exists) return;
        set({ sources: [...get().sources, { sourceType, sourceValue }] });
      },

      removeSource: (sourceType, sourceValue) => {
        set({
          sources: get().sources.filter(
            (s) => !(s.sourceType === sourceType && s.sourceValue.toLowerCase() === sourceValue.toLowerCase())
          )
        });
      },

      toggleColumn: (key) => {
        const cv = { ...get().columnsVisibility };
        cv[key] = !cv[key];
        set({ columnsVisibility: cv });
      },

      setColumnsOrder: (order) => {
        set({ columnsOrder: normalizeColumnOrder(order) as ColumnKey[] });
      },

      moveColumn: (fromIdx, toIdx) => {
        const order = [...get().columnsOrder];
        if (fromIdx < 0 || toIdx < 0 || fromIdx >= order.length || toIdx >= order.length) return;
        const [moved] = order.splice(fromIdx, 1);
        order.splice(toIdx, 0, moved);
        set({ columnsOrder: order });
      },

      clear: () => set(emptyState()),

      loadFromServer: (catalogue, items, sources) => {
        set({
          catalogueId: catalogue.catalogueId,
          catalogueName: catalogue.catalogueName,
          notes: catalogue.notes,
          titleDate: catalogue.titleDate || '',
          defaultDiscountPercent: catalogue.defaultDiscountPercent,
          showDiscountColumn: catalogue.showDiscountColumn,
          exportMode: catalogue.exportMode,
          columnsVisibility: { ...DEFAULT_COLUMNS, ...(catalogue.columnsVisibility || {}) },
          columnsOrder: normalizeColumnOrder(catalogue.columnsOrder) as ColumnKey[],
          items,
          sources
        });
      },

      setSavedId: (id) => set({ catalogueId: id })
    }),
    {
      name: 'catalogue-draft-v1',
      // Don't persist the saved id — a refresh starts a fresh draft until the
      // user explicitly loads a saved one.
      partialize: (s) => ({
        catalogueName: s.catalogueName,
        notes: s.notes,
        titleDate: s.titleDate,
        defaultDiscountPercent: s.defaultDiscountPercent,
        showDiscountColumn: s.showDiscountColumn,
        exportMode: s.exportMode,
        columnsVisibility: s.columnsVisibility,
        columnsOrder: s.columnsOrder,
        items: s.items,
        sources: s.sources
      })
    }
  )
);

// Convenience selector: items currently shown in the catalogue (ordered, not removed).
export function visibleItems(state: CatalogueState): CatalogueItem[] {
  return state.items
    .filter((i) => !i.manuallyRemoved)
    .slice()
    .sort((a, b) => a.selectedOrder - b.selectedOrder);
}
