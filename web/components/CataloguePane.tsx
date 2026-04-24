'use client';
import { ListChecks, Eye } from 'lucide-react';
import clsx from 'clsx';

import type {
  CatalogueItem,
  ColumnKey,
  ColumnsVisibility,
  ExportMode,
  Product
} from '@/lib/types';
import { CatalogueToolbar } from './CatalogueToolbar';
import { CataloguePanel } from './CataloguePanel';
import { CataloguePreview } from './CataloguePreview';

export type PaneTab = 'build' | 'preview';

type Props = {
  tab: PaneTab;
  onTabChange: (t: PaneTab) => void;
  items: CatalogueItem[];
  productByKey: Map<string, Product>;
  catalogueName: string;
  titleDate: string;
  notes: string;
  defaultDiscountPercent: number;
  showDiscountColumn: boolean;
  columnsVisibility: ColumnsVisibility;
  columnsOrder: ColumnKey[];
  exportMode: ExportMode;
  onClear: () => void;
  onSave: () => void;
  onLoad: () => void;
  onExportXlsx: () => void;
  onExportPdf: () => void;
};

export function CataloguePane({
  tab,
  onTabChange,
  items,
  productByKey,
  catalogueName,
  titleDate,
  notes,
  defaultDiscountPercent,
  showDiscountColumn,
  columnsVisibility,
  columnsOrder,
  exportMode,
  onClear,
  onSave,
  onLoad,
  onExportXlsx,
  onExportPdf
}: Props) {
  return (
    <div className="space-y-3 p-4">
      <CatalogueToolbar
        itemCount={items.length}
        onClear={onClear}
        onSave={onSave}
        onLoad={onLoad}
        onExportXlsx={onExportXlsx}
        onExportPdf={onExportPdf}
      />

      <div className="inline-flex rounded-xl border border-line bg-white p-1 shadow-card">
        <TabButton active={tab === 'build'} onClick={() => onTabChange('build')}>
          <ListChecks size={14} /> Build ({items.length})
        </TabButton>
        <TabButton active={tab === 'preview'} onClick={() => onTabChange('preview')}>
          <Eye size={14} /> Preview
        </TabButton>
      </div>

      <div>
        {tab === 'build' ? (
          <CataloguePanel productByKey={productByKey} />
        ) : (
          <CataloguePreview
            catalogueName={catalogueName}
            titleDate={titleDate}
            notes={notes}
            items={items}
            productByKey={productByKey}
            defaultDiscountPercent={defaultDiscountPercent}
            showDiscountColumn={showDiscountColumn}
            columns={columnsVisibility}
            columnsOrder={columnsOrder}
            exportMode={exportMode}
          />
        )}
      </div>
    </div>
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
