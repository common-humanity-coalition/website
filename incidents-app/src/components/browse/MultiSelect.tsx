import { useEffect, useId, useRef, useState } from 'react';
import type { VocabTerm } from '../../lib/types';

interface Props {
  label: string;
  options: VocabTerm[];
  selected: string[];
  onChange: (next: string[]) => void;
}

/** Accessible disclosure-style multi-select (checkbox list in a popover). */
export default function MultiSelect({ label, options, selected, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const toggle = (value: string) => {
    onChange(
      selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]
    );
  };

  const summary = selected.length === 0 ? 'Any' : `${selected.length} selected`;

  return (
    <div className="relative" ref={ref}>
      <label id={`${id}-label`} className="mb-1 block text-xs font-semibold text-ink-soft">
        {label}
      </label>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={`${id}-label`}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 rounded-md border border-line bg-surface px-3 py-2 text-left text-sm text-ink transition-colors hover:border-accent-ring"
      >
        <span className={selected.length ? 'text-ink' : 'text-ink-faint'}>{summary}</span>
        <span aria-hidden="true" className="text-ink-faint">{open ? '▴' : '▾'}</span>
      </button>

      {open && (
        <div
          role="listbox"
          aria-multiselectable="true"
          aria-labelledby={`${id}-label`}
          className="absolute z-30 mt-1 max-h-64 w-full min-w-56 overflow-auto rounded-md border border-line bg-surface p-1 shadow-lg"
        >
          {options.map((opt) => {
            const checked = selected.includes(opt.value);
            return (
              <label
                key={opt.value}
                className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm text-ink hover:bg-sand-50"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(opt.value)}
                  className="h-4 w-4 shrink-0 accent-[#1f5b56]"
                />
                <span>{opt.label}</span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
