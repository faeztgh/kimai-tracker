import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useDismiss } from "../hooks/useDismiss";

export interface PickerOption {
  id: number;
  label: string;
  color?: string;
  group?: string;
}

interface Props {
  options: PickerOption[];
  value: number | undefined;
  onChange: (id: number | undefined) => void;
  placeholder: string;
  searchable?: boolean;
  loading?: boolean;
  disabled?: boolean;
  allowClear?: boolean;
  dot?: boolean;
  fit?: boolean;
  defaultOpen?: boolean;
  onClose?: () => void;
}

interface Pos {
  left: number;
  width: number;
  top?: number;
  bottom?: number;
}

export function Picker({
  options,
  value,
  onChange,
  placeholder,
  searchable = true,
  loading = false,
  disabled = false,
  allowClear = false,
  dot = false,
  fit = false,
  defaultOpen = false,
  onClose,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const [query, setQuery] = useState("");
  const [pos, setPos] = useState<Pos>({ left: 0, width: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const closeOnly = () => {
    setOpen(false);
    setQuery("");
  };
  const dismiss = () => {
    closeOnly();
    onClose?.();
  };

  useDismiss(open, [btnRef, menuRef], dismiss);

  useLayoutEffect(() => {
    if (!open) return;
    const b = btnRef.current?.getBoundingClientRect();
    if (!b) return;
    const width = fit ? Math.max(b.width, 224) : b.width;
    const left = Math.min(Math.max(8, b.left), window.innerWidth - width - 8);
    const gap = 6;
    const spaceBelow = window.innerHeight - b.bottom;
    const flipUp = spaceBelow < 280 && b.top > spaceBelow;
    setPos(
      flipUp
        ? { left, width, bottom: window.innerHeight - b.top + gap }
        : { left, width, top: b.bottom + gap },
    );
  }, [open, fit]);

  const selected = options.find((o) => o.id === value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;
  }, [options, query]);

  const grouped = useMemo(() => {
    const map = new Map<string, PickerOption[]>();
    for (const o of filtered) {
      const g = o.group ?? "";
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(o);
    }
    return [...map.entries()];
  }, [filtered]);

  return (
    <div className={`min-w-0 ${fit ? "" : "w-full"}`}>
      <button
        ref={btnRef}
        type="button"
        disabled={disabled || loading}
        onClick={() => (open ? dismiss() : setOpen(true))}
        className={`${fit ? "inline-flex w-auto max-w-[220px]" : "flex w-full"} items-center gap-1.5 rounded-lg
          border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-700 transition hover:bg-gray-50
          disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600`}
      >
        {dot && selected && (
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: selected.color ?? "#9ca3af" }}
          />
        )}
        <span
          className={`truncate ${
            selected ? "text-gray-800 dark:text-gray-100" : "text-gray-400 dark:text-gray-500"
          }`}
        >
          {loading ? "Loading…" : (selected?.label ?? placeholder)}
        </span>
        <svg
          className="ml-auto h-4 w-4 shrink-0 text-gray-400 dark:text-gray-500"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {open &&
        createPortal(
          <div
            ref={menuRef}
            style={{ position: "fixed", left: pos.left, width: pos.width, top: pos.top, bottom: pos.bottom }}
            className="anim-dropdown z-[70] max-h-64 overflow-auto rounded-lg border border-gray-200 bg-white py-1
              shadow-xl dark:border-gray-700 dark:bg-gray-800"
          >
            {searchable && (
              <div className="sticky top-0 bg-white px-2 pb-1.5 pt-1 dark:bg-gray-800">
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search…"
                  className="w-full rounded-md border border-gray-200 bg-white px-2 py-1 text-sm text-gray-800
                    focus:border-accent-400 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                />
              </div>
            )}

            {allowClear && value !== undefined && (
              <button
                type="button"
                onClick={() => {
                  onChange(undefined);
                  closeOnly();
                }}
                className="block w-full px-3 py-1.5 text-left text-sm text-gray-400 hover:bg-gray-100
                  dark:text-gray-500 dark:hover:bg-gray-700"
              >
                Clear selection
              </button>
            )}

            {filtered.length === 0 && (
              <p className="px-3 py-2 text-sm text-gray-400 dark:text-gray-500">No matches</p>
            )}

            {grouped.map(([group, opts]) => (
              <div key={group || "_"}>
                {group && (
                  <p className="px-3 pb-0.5 pt-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                    {group}
                  </p>
                )}
                {opts.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => {
                      onChange(o.id);
                      closeOnly();
                    }}
                    className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition ${
                      o.id === value
                        ? "bg-accent-50 text-accent-700 dark:bg-accent-900/40 dark:text-accent-300"
                        : "text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                    }`}
                  >
                    {dot && (
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: o.color ?? "#9ca3af" }}
                      />
                    )}
                    <span className="truncate">{o.label}</span>
                  </button>
                ))}
              </div>
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
}
