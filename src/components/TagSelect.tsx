import { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useDismiss } from "../hooks/useDismiss";

interface Props {
  options: string[];
  value: string[];
  onChange: (next: string[]) => void;
  loading?: boolean;
  fit?: boolean;
  placeholder?: string;
  allowCreate?: boolean;
}

export function TagSelect({
  options,
  value,
  onChange,
  loading = false,
  fit = false,
  placeholder: placeholderProp,
  allowCreate = true,
}: Props) {
  const { t } = useTranslation();
  const placeholder = placeholderProp ?? t("editModal.tags");
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useDismiss(open, [ref], () => setOpen(false));

  const q = query.trim().toLowerCase();
  const filtered = useMemo(
    () => (q ? options.filter((o) => o.toLowerCase().includes(q)) : options),
    [options, q],
  );
  const exists =
    options.some((o) => o.toLowerCase() === q) ||
    value.some((v) => v.toLowerCase() === q);

  function toggle(tag: string) {
    onChange(
      value.includes(tag) ? value.filter((t) => t !== tag) : [...value, tag],
    );
  }
  function addNew() {
    const t = query.trim();
    if (t && !value.includes(t)) onChange([...value, t]);
    setQuery("");
  }

  const label = value.length === 0 ? placeholder : value.join(", ");

  return (
    <div ref={ref} className={`relative min-w-0 ${fit ? "" : "w-full"}`}>
      <button
        type="button"
        disabled={loading}
        onClick={() => setOpen((v) => !v)}
        className={`${fit ? "inline-flex w-auto max-w-50" : "flex w-full"} items-center gap-1.5 rounded-lg
          border border-gray-300 bg-white px-2.5 py-1.5 text-sm transition hover:bg-gray-50 disabled:opacity-50
          dark:border-gray-600 dark:bg-gray-700 dark:hover:bg-gray-600 ${
            value.length
              ? "text-gray-800 dark:text-gray-100"
              : "text-gray-400 dark:text-gray-500"
          }`}
      >
        <svg
          className="h-3.5 w-3.5 shrink-0 text-gray-400"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
          <line x1="7" y1="7" x2="7.01" y2="7" />
        </svg>
        <span className="truncate">
          {loading ? t("common.loading") : label}
        </span>
        {value.length > 0 && (
          <span className="ml-0.5 shrink-0 rounded bg-accent-100 px-1 text-[10px] font-semibold text-accent-700 dark:bg-accent-900/50 dark:text-accent-300">
            {value.length}
          </span>
        )}
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

      {open && (
        <div
          className={`anim-dropdown absolute z-50 mt-1.5 max-h-64 overflow-auto rounded-lg border border-gray-200 bg-white py-1
            shadow-xl dark:border-gray-700 dark:bg-gray-800 ${fit ? "left-0 min-w-56" : "left-0 right-0"}`}
        >
          <div className="sticky top-0 bg-white px-2 pb-1.5 pt-1 dark:bg-gray-800">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && allowCreate && q && !exists) {
                  e.preventDefault();
                  addNew();
                }
              }}
              placeholder={
                allowCreate ? t("tagSelect.searchOrAdd") : t("tagSelect.search")
              }
              className="w-full rounded-md border border-gray-200 bg-white px-2 py-1 text-sm text-gray-800
                focus:border-accent-400 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            />
          </div>

          {allowCreate && q && !exists && (
            <button
              type="button"
              onClick={addNew}
              className="block w-full px-3 py-1.5 text-left text-sm text-accent-600 hover:bg-gray-100 dark:text-accent-400 dark:hover:bg-gray-700"
            >
              Add &ldquo;{query.trim()}&rdquo;
            </button>
          )}

          {filtered.length === 0 && !query && (
            <p className="px-3 py-2 text-sm text-gray-400 dark:text-gray-500">
              No tags on the server
            </p>
          )}

          {filtered.map((tag) => {
            const sel = value.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={() => toggle(tag)}
                className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition ${
                  sel
                    ? "bg-accent-50 text-accent-700 dark:bg-accent-900/40 dark:text-accent-300"
                    : "text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                }`}
              >
                <span
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                    sel
                      ? "border-accent-500 bg-accent-500 text-white"
                      : "border-gray-300 dark:border-gray-500"
                  }`}
                >
                  {sel && (
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  )}
                </span>
                <span className="truncate">{tag}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
