'use client';
import { useEffect, useState } from 'react';
import { Dialog } from './ui/Dialog';
import { Input } from './ui/Input';
import { Button } from './ui/Button';

type Props = {
  open: boolean;
  initialName: string;
  saving: boolean;
  onClose: () => void;
  onConfirm: (name: string) => void;
};

function suggestedName(): string {
  const d = new Date();
  const m = d.toLocaleString(undefined, { month: 'short' });
  return `${m} ${d.getFullYear()} catalogue`;
}

export function SaveCatalogueDialog({
  open,
  initialName,
  saving,
  onClose,
  onConfirm
}: Props) {
  const [name, setName] = useState(initialName);

  useEffect(() => {
    if (open) setName(initialName);
  }, [open, initialName]);

  const trimmed = name.trim();
  const placeholder = suggestedName();

  return (
    <Dialog
      open={open}
      title="Save catalogue"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() => onConfirm(trimmed || placeholder)}
            disabled={saving}
          >
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </>
      }
    >
      <label className="text-xs text-muted">Catalogue name</label>
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={placeholder}
        autoFocus
        className="mt-1"
      />
      <p className="mt-2 text-xs text-muted">
        {trimmed
          ? 'Existing catalogues with the same id are updated; otherwise a new one is created.'
          : `Saved as "${placeholder}" if you leave this blank.`}
      </p>
    </Dialog>
  );
}
