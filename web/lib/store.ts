import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  AddedBySource,
  Catalogue,
  CatalogueItem,
  CatalogueSource,
  ColumnsVisibility,
  ExportMode
} from './types';

// Keep the working catalogue in memory (and a draft copy in localStorage so a
// reload doesn't lose unsaved work). Saved catalogues live on the server.

type CatalogueState = {
  catalogueId: string | null;
  catalogueName: string;
  notes: string;
  defaultDiscountPercent: number;
  showDiscountColumn: boolean;
  exportMode: ExportMode;
  columnsVisibility: ColumnsVisibility;
  items: CatalogueItem[];
  sources: CatalogueSource[];

  // mutations
  setMeta: (m: Partial<Pick<Catalogue, 'catalogueName' | 'notes' | 'defaultDiscountPercent' | 'showDiscountColumn' | 'exportMode' | 'columnsVisibility'>>) => void;
  addProduct: (productKey: string, source: AddedBySource) => void;
  addManyProducts: (keys: string[], source: AddedBySource) => void;
  removeProduct: (productKey: string) => void;
  toggleExclude: (productKey: string) => void;
  setNote: (productKey: string, note: string) => void;
  reorder: (fromIdx: number, toIdx: number) => void;
  addSource: (sourceType: 'category' | 'tag', sourceValue: string) => void;
  removeSource: (sourceType: 'category' | 'tag', sourceValue: string) => void;
  toggleColumn: (key: keyof ColumnsVisibility) => void;
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
    catalogueName: 'Untitled catalogue',
    notes: '',
    defaultDiscountPercent: 0,
    showDiscountColumn: false,
    exportMode: 'customer' as ExportMode,
    columnsVisibility: { ...DEFAULT_COLUMNS },
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

      clear: () => set(emptyState()),

      loadFromServer: (catalogue, items, sources) => {
        set({
          catalogueId: catalogue.catalogueId,
          catalogueName: catalogue.catalogueName,
          notes: catalogue.notes,
          defaultDiscountPercent: catalogue.defaultDiscountPercent,
          showDiscountColumn: catalogue.showDiscountColumn,
          exportMode: catalogue.exportMode,
          columnsVisibility: { ...DEFAULT_COLUMNS, ...(catalogue.columnsVisibility || {}) },
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
        defaultDiscountPercent: s.defaultDiscountPercent,
        showDiscountColumn: s.showDiscountColumn,
        exportMode: s.exportMode,
        columnsVisibility: s.columnsVisibility,
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
