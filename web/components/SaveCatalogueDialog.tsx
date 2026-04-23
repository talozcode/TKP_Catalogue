'use client';
import { useState } from 'react';
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

export function SaveCatalogueDialog({ open, initialName, saving, onClose, onConfirm }: Props) {
  const [name, setName] = useState(initialName);
  return (
    <Dialog
      open={open}
      title="Save catalogue"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button variant="primary" onClick={() => onConfirm(name.trim())} disabled={!name.trim() || saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </>
      }
    >
      <label className="text-xs text-muted">Catalogue name</label>
      <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus className="mt-1" />
      <p className="mt-2 text-xs text-muted">
        If a catalogue with this id already exists it will be updated; otherwise a new one is created.
      </p>
    </Dialog>
  );
}
