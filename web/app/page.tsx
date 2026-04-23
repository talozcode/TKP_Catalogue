'use client';
import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Folder, Tag, ListChecks, Eye } from 'lucide-react';
import clsx from 'clsx';

import { api } from '@/lib/api';
import { useCatalogue, visibleItems } from '@/lib/store';
import {
  buildIndex,
  countNewProducts,
  productsByCategory,
  productsByTag,
  searchProducts
} from '@/lib/search';
import { exportToXlsx } from '@/lib/export-xlsx';
import { exportToPdf } from '@/lib/export-pdf';

import { Header } from '@/components/Header';
import { SearchBar } from '@/components/SearchBar';
import { ProductGrid } from '@/components/ProductGrid';
import { CataloguePanel } from '@/components/CataloguePanel';
import { CataloguePreview } from '@/components/CataloguePreview';
import { CatalogueToolbar } from '@/components/CatalogueToolbar';
import { SaveCatalogueDialog } from '@/components/SaveCatalogueDialog';
import { LoadCatalogueDialog } from '@/components/LoadCatalogueDialog';
import { Spinner } from '@/components/ui/Spinner';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/Toast';
import type { CatalogueSummary } from '@/lib/types';

type PaneTab = 'build' | 'preview';

export default function Page() {
  const qc = useQueryClient();

  const productsQuery = useQuery({
    queryKey: ['products'],
    queryFn: () => api.getProducts()
  });

  const products = productsQuery.data?.products ?? [];
  const lastSyncedAt = productsQuery.data?.lastSyncedAt ?? null;

  const index = useMemo(() => buildIndex(products), [products]);
  const productByKey = useMemo(() => {
    const m = new Map<string, typeof products[number]>();
    for (const p of products) m.set(p.internalReference, p);
    return m;
  }, [products]);

  const [query, setQuery]       = useState('');
  const [category, setCategory] = useState('');
  const [tag, setTag]           = useState('');
  const [onlyNew, setOnlyNew]   = useState(false);

  const results = useMemo(
    () => searchProducts(index, { query, category, tag, onlyNew }),
    [index, query, category, tag, onlyNew]
  );
  const newCount = useMemo(() => countNewProducts(index), [index]);

  // Catalogue state
  const items                 = useCatalogue(visibleItems);
  const itemKeys              = useMemo(() => new Set(items.map((i) => i.productKey)), [items]);
  const addProduct            = useCatalogue((s) => s.addProduct);
  const addMany               = useCatalogue((s) => s.addManyProducts);
  const addSource             = useCatalogue((s) => s.addSource);
  const clear                 = useCatalogue((s) => s.clear);
  const setSavedId            = useCatalogue((s) => s.setSavedId);
  const loadFromSrv           = useCatalogue((s) => s.loadFromServer);
  const cs                    = useCatalogue.getState;
  const catalogueName         = useCatalogue((s) => s.catalogueName);
  const notes                 = useCatalogue((s) => s.notes);
  const discountPct           = useCatalogue((s) => s.defaultDiscountPercent);
  const showDiscount          = useCatalogue((s) => s.showDiscountColumn);
  const exportMode            = useCatalogue((s) => s.exportMode);
  const columnsVisibility     = useCatalogue((s) => s.columnsVisibility);
  const columnsOrder          = useCatalogue((s) => s.columnsOrder);

  const [showSave, setShowSave] = useState(false);
  const [showLoad, setShowLoad] = useState(false);
  const [tab, setTab] = useState<PaneTab>('build');

  const cataloguesQuery = useQuery({
    queryKey: ['catalogues'],
    queryFn: () => api.listCatalogues(),
    enabled: showLoad
  });

  const saveMut = useMutation({
    mutationFn: async (newName: string) => {
      const s = cs();
      return api.saveCatalogue({
        catalogue: {
          catalogueId: s.catalogueId || undefined,
          catalogueName: newName || s.catalogueName,
          notes: s.notes,
          defaultDiscountPercent: s.defaultDiscountPercent,
          showDiscountColumn: s.showDiscountColumn,
          exportMode: s.exportMode,
          columnsVisibility: s.columnsVisibility,
          columnsOrder: s.columnsOrder
        },
        items: s.items,
        sources: s.sources
      });
    },
    onSuccess: (data) => {
      setSavedId(data.catalogueId);
      setShowSave(false);
      toast.success('Catalogue saved');
      qc.invalidateQueries({ queryKey: ['catalogues'] });
    },
    onError: (e: Error) => toast.error(e.message)
  });

  const loadMut = useMutation({
    mutationFn: (id: string) => api.loadCatalogue(id),
    onSuccess: (resp) => {
      loadFromSrv(resp.catalogue, resp.items, resp.sources);
      setShowLoad(false);
      toast.success(`Loaded "${resp.catalogue.catalogueName}"`);
    },
    onError: (e: Error) => toast.error(e.message)
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.deleteCatalogue(id),
    onSuccess: () => {
      toast.success('Deleted');
      qc.invalidateQueries({ queryKey: ['catalogues'] });
    },
    onError: (e: Error) => toast.error(e.message)
  });

  const duplicateMut = useMutation({
    mutationFn: (id: string) => api.duplicateCatalogue(id),
    onSuccess: () => {
      toast.success('Duplicated');
      qc.invalidateQueries({ queryKey: ['catalogues'] });
    },
    onError: (e: Error) => toast.error(e.message)
  });

  function addByCategory() {
    if (!category) return;
    const keys = productsByCategory(index, category).map((p) => p.internalReference);
    addMany(keys, 'category');
    addSource('category', category);
    toast.info(`Added ${keys.length} from ${category}`);
  }
  function addByTag() {
    if (!tag) return;
    const keys = productsByTag(index, tag).map((p) => p.internalReference);
    addMany(keys, 'tag');
    addSource('tag', tag);
    toast.info(`Added ${keys.length} tagged ${tag}`);
  }

  function doExportXlsx() {
    const s = cs();
    exportToXlsx({
      catalogueName: s.catalogueName,
      items: visibleItems(s),
      productByKey,
      defaultDiscountPercent: s.defaultDiscountPercent,
      showDiscountColumn: s.showDiscountColumn,
      columns: s.columnsVisibility,
      columnsOrder: s.columnsOrder,
      exportMode: s.exportMode
    });
  }
  async function doExportPdf() {
    const s = cs();
    toast.info('Building PDF…');
    try {
      await exportToPdf({
        catalogueName: s.catalogueName,
        notes: s.notes,
        items: visibleItems(s),
        productByKey,
        defaultDiscountPercent: s.defaultDiscountPercent,
        showDiscountColumn: s.showDiscountColumn,
        columns: s.columnsVisibility,
        columnsOrder: s.columnsOrder,
        exportMode: s.exportMode
      });
      toast.success('PDF ready');
    } catch (e) {
      toast.error((e as Error).message || 'PDF export failed');
    }
  }

  return (
    <>
      <Header lastSyncedAt={lastSyncedAt} productCount={products.length} />
      <main className="mx-auto max-w-screen-2xl px-4 py-5 md:px-6">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_460px]">
          {/* Left: search + grid */}
          <section className="space-y-3">
            <SearchBar
              query={query}
              category={category}
              tag={tag}
              categories={index.categories}
              tags={index.tags}
              onlyNew={onlyNew}
              newCount={newCount}
              onQuery={setQuery}
              onCategory={setCategory}
              onTag={setTag}
              onOnlyNew={setOnlyNew}
              resultCount={results.length}
            />

            {(category || tag) ? (
              <div className="flex flex-wrap gap-2">
                {category ? (
                  <Button size="sm" variant="primary" onClick={addByCategory}>
                    <Folder size={14} /> Add all {results.length} in “{category}”
                  </Button>
                ) : null}
                {tag ? (
                  <Button size="sm" variant="primary" onClick={addByTag}>
                    <Tag size={14} /> Add all {results.length} tagged “{tag}”
                  </Button>
                ) : null}
              </div>
            ) : null}

            {productsQuery.isLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted">
                <Spinner /> Loading products from Google Sheets…
              </div>
            ) : productsQuery.isError ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {(productsQuery.error as Error).message}
              </div>
            ) : (
              <ProductGrid
                products={results}
                inCatalogueKeys={itemKeys}
                onAdd={(k) => addProduct(k, 'search')}
              />
            )}
          </section>

          {/* Right: catalogue */}
          <aside className="space-y-3 lg:sticky lg:top-[80px] lg:self-start">
            <CatalogueToolbar
              itemCount={items.length}
              onClear={() => {
                if (confirm('Clear the current catalogue?')) clear();
              }}
              onSave={() => setShowSave(true)}
              onLoad={() => setShowLoad(true)}
              onExportXlsx={doExportXlsx}
              onExportPdf={doExportPdf}
            />

            {/* Build / Preview tabs */}
            <div className="inline-flex rounded-xl border border-line bg-white p-1 shadow-card">
              <TabButton active={tab === 'build'} onClick={() => setTab('build')}>
                <ListChecks size={14} /> Build ({items.length})
              </TabButton>
              <TabButton
                active={tab === 'preview'}
                onClick={() => setTab('preview')}
              >
                <Eye size={14} /> Preview
              </TabButton>
            </div>

            <div
              className={clsx(
                'scrollbar-thin pr-1',
                tab === 'build'
                  ? 'max-h-[calc(100vh-310px)] overflow-y-auto'
                  : 'max-h-[calc(100vh-310px)] overflow-auto'
              )}
            >
              {tab === 'build' ? (
                <CataloguePanel productByKey={productByKey} />
              ) : (
                <CataloguePreview
                  catalogueName={catalogueName}
                  notes={notes}
                  items={items}
                  productByKey={productByKey}
                  defaultDiscountPercent={discountPct}
                  showDiscountColumn={showDiscount}
                  columns={columnsVisibility}
                  columnsOrder={columnsOrder}
                  exportMode={exportMode}
                />
              )}
            </div>
          </aside>
        </div>
      </main>

      <SaveCatalogueDialog
        open={showSave}
        initialName={cs().catalogueName}
        saving={saveMut.isPending}
        onClose={() => setShowSave(false)}
        onConfirm={(name) => saveMut.mutate(name)}
      />

      <LoadCatalogueDialog
        open={showLoad}
        loading={cataloguesQuery.isLoading}
        catalogues={(cataloguesQuery.data?.catalogues || []) as CatalogueSummary[]}
        onClose={() => setShowLoad(false)}
        onLoad={(id) => loadMut.mutate(id)}
        onDuplicate={(id) => duplicateMut.mutate(id)}
        onDelete={(id) => deleteMut.mutate(id)}
      />
    </>
  );
}

function TabButton({
  active,
  onClick,
  children
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition',
        active
          ? 'bg-brand text-white shadow-sm'
          : 'text-ink/70 hover:bg-brandSoft hover:text-brand'
      )}
    >
      {children}
    </button>
  );
}
