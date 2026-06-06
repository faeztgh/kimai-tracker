import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toDatetimeLocalInput } from "../lib/format";
import { useDismiss } from "../hooks/useDismiss";
import { flipPosition } from "../lib/popover";
import { useSettings } from "../store/settings";

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const WEEKDAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const POP_W = 268;
const POP_H = 348;

function parse(value: string): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function monthGrid(view: Date, weekStart: number): Date[] {
  const first = startOfMonth(view);
  const lead = (first.getDay() - weekStart + 7) % 7;
  const start = new Date(first);
  start.setDate(first.getDate() - lead);
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

export function DateTimePicker({ value, onChange, placeholder = "Pick date & time" }: Props) {
  const weekStart = useSettings((s) => s.weekStart);
  const selected = useMemo(() => parse(value), [value]);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<Date>(() => startOfMonth(selected ?? new Date()));
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) setView(startOfMonth(selected ?? new Date()));
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useDismiss(open, [btnRef, popRef], () => setOpen(false));

  function toggle() {
    const r = btnRef.current?.getBoundingClientRect();
    if (r) setPos(flipPosition(r, POP_W, POP_H, "left"));
    setOpen((o) => !o);
  }

  function emit(next: Date) {
    onChange(toDatetimeLocalInput(next));
  }

  function pickDay(day: Date) {
    const base = selected ?? new Date();
    const d = new Date(day);
    d.setHours(base.getHours(), base.getMinutes(), 0, 0);
    emit(d);
  }

  function setHours(h: number) {
    const base = selected ?? new Date();
    const d = new Date(base);
    d.setHours(Math.min(23, Math.max(0, h)), base.getMinutes(), 0, 0);
    emit(d);
  }
  function setMinutes(m: number) {
    const base = selected ?? new Date();
    const d = new Date(base);
    d.setMinutes(Math.min(59, Math.max(0, m)), 0, 0);
    emit(d);
  }

  const label = selected
    ? `${selected.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })} · ${pad(selected.getHours())}:${pad(selected.getMinutes())}`
    : placeholder;

  const today = new Date();
  const grid = monthGrid(view, weekStart);
  const weekdays = Array.from({ length: 7 }, (_, i) => WEEKDAY_LABELS[(weekStart + i) % 7]);
  const hh = selected ? pad(selected.getHours()) : "--";
  const mm = selected ? pad(selected.getMinutes()) : "--";

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        className={`flex w-full items-center gap-2 rounded-lg border px-2.5 py-1.5 text-sm transition
          ${open ? "border-accent-400" : "border-gray-300 dark:border-gray-600"}
          bg-white text-gray-800 hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600`}
      >
        <svg className="h-4 w-4 shrink-0 text-gray-400 dark:text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
        <span className={`truncate ${selected ? "" : "text-gray-400 dark:text-gray-500"}`}>{label}</span>
      </button>

      {open &&
        createPortal(
          <div
            ref={popRef}
            style={{ position: "fixed", top: pos.top, left: pos.left, width: POP_W }}
            className="anim-dropdown z-50 rounded-xl border border-gray-200 bg-white p-3 shadow-2xl dark:border-gray-700 dark:bg-gray-800"
          >
            <div className="mb-2 flex items-center justify-between">
              <button type="button" onClick={() => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))} className="rounded-md p-1 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700">
                <Chevron dir="left" />
              </button>
              <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                {view.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
              </span>
              <button type="button" onClick={() => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))} className="rounded-md p-1 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700">
                <Chevron dir="right" />
              </button>
            </div>

            <div className="mb-1 grid grid-cols-7 gap-0.5">
              {weekdays.map((w, i) => (
                <span key={i} className="py-1 text-center text-[10px] font-medium text-gray-400 dark:text-gray-500">
                  {w}
                </span>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-0.5">
              {grid.map((d, i) => {
                const inMonth = d.getMonth() === view.getMonth();
                const isSel = selected && sameDay(d, selected);
                const isToday = sameDay(d, today);
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => pickDay(d)}
                    className={`h-8 rounded-md text-center text-xs transition ${
                      isSel
                        ? "bg-accent-500 font-semibold text-white"
                        : `${inMonth ? "text-gray-700 dark:text-gray-200" : "text-gray-300 dark:text-gray-600"} hover:bg-gray-100 dark:hover:bg-gray-700`
                    } ${isToday && !isSel ? "ring-1 ring-inset ring-accent-400" : ""}`}
                  >
                    {d.getDate()}
                  </button>
                );
              })}
            </div>

            <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3 dark:border-gray-700">
              <div className="flex items-center gap-1">
                <svg className="mr-1 h-4 w-4 text-gray-400 dark:text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v5l3 2" />
                </svg>
                <TimeBox value={hh} max={23} onCommit={setHours} />
                <span className="font-semibold text-gray-400">:</span>
                <TimeBox value={mm} max={59} onCommit={setMinutes} />
              </div>
              <button
                type="button"
                onClick={() => emit(new Date())}
                className="rounded-md px-2 py-1 text-xs font-medium text-accent-600 hover:bg-accent-50 dark:text-accent-400 dark:hover:bg-accent-900/30"
              >
                Now
              </button>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function Chevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d={dir === "left" ? "M15 18l-6-6 6-6" : "M9 18l6-6-6-6"} />
    </svg>
  );
}

function TimeBox({ value, max, onCommit }: { value: string; max: number; onCommit: (n: number) => void }) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  return (
    <input
      value={draft}
      inputMode="numeric"
      onChange={(e) => setDraft(e.target.value.replace(/\D/g, "").slice(0, 2))}
      onFocus={(e) => e.target.select()}
      onBlur={() => {
        const n = Number(draft);
        if (Number.isFinite(n) && draft !== "") onCommit(Math.min(max, n));
        else setDraft(value);
      }}
      onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
      className="w-9 rounded-md border border-gray-300 bg-white py-1 text-center text-sm tabular-nums text-gray-800
        focus:border-accent-400 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
    />
  );
}
