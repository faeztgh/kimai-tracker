import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import type { KimaiTimesheet } from "../api/types";
import { useDismiss } from "../hooks/useDismiss";
import type { EntityLookup } from "../hooks/useEntities";
import {
  durationOf,
  formatClock,
  formatTimer,
  parseDuration,
} from "../lib/format";
import { flipPosition } from "../lib/popover";

interface Props {
  timer: KimaiTimesheet;
  lookup: EntityLookup;
  onResume: (t: KimaiTimesheet) => void;
  onEdit: (t: KimaiTimesheet) => void;
  onDelete: (t: KimaiTimesheet) => void;
  onDuplicate: (t: KimaiTimesheet) => void;
  onSplit: (t: KimaiTimesheet) => void;
  onSetDuration?: (timer: KimaiTimesheet, seconds: number) => void;
  disabled?: boolean;
}

export function EntryRow({
  timer,
  lookup,
  onResume,
  onEdit,
  onDelete,
  onDuplicate,
  onSplit,
  onSetDuration,
  disabled,
}: Props) {
  const { t } = useTranslation();
  const [editingDuration, setEditingDuration] = useState(false);
  const [draftDuration, setDraftDuration] = useState("");

  return (
    <div className="anim-fade-up group flex items-center gap-2.5 px-3.5 py-2 transition hover:bg-gray-50 dark:hover:bg-gray-800/60">
      <span
        className="h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: lookup.entryColor(timer) }}
      />

      <button
        type="button"
        onClick={() => onEdit(timer)}
        className="min-w-0 flex-1 text-left"
        title={t("entries.editEntry")}
      >
        <p
          className={`truncate text-sm ${
            timer.description
              ? "text-gray-800 dark:text-gray-100"
              : "italic text-gray-400 dark:text-gray-500"
          }`}
        >
          {timer.description || t("entries.noDescription")}
        </p>
        <p className="truncate text-xs text-gray-500 dark:text-gray-400">
          {lookup.project(timer.project)} · {lookup.activity(timer.activity)}
        </p>
      </button>

      {timer.billable && (
        <span
          className="text-sm font-bold text-emerald-600 dark:text-emerald-400"
          title={t("tracker.billable")}
        >
          $
        </span>
      )}

      <div className="flex shrink-0 items-center gap-3 sm:gap-5">
        {timer.end && (
          <span className="whitespace-nowrap font-mono text-xs tabular-nums text-gray-400 dark:text-gray-500">
            {formatClock(timer.begin)} – {formatClock(timer.end)}
          </span>
        )}
        {editingDuration ? (
          <input
            autoFocus
            type="text"
            value={draftDuration}
            onChange={(e) => setDraftDuration(e.target.value)}
            onBlur={() => {
              setEditingDuration(false);
              const secs = parseDuration(draftDuration);
              if (secs !== null && secs > 0 && onSetDuration) {
                onSetDuration(timer, secs);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setEditingDuration(false);
                const secs = parseDuration(draftDuration);
                if (secs !== null && secs > 0 && onSetDuration) {
                  onSetDuration(timer, secs);
                }
              } else if (e.key === "Escape") {
                setEditingDuration(false);
              }
            }}
            className="w-[58px] rounded border border-accent-400 bg-white px-1 py-0.5 text-right font-mono text-sm
              tabular-nums text-gray-800 focus:outline-none dark:bg-gray-700 dark:text-gray-100"
            title={t("entries.durationHint")}
          />
        ) : (
          <button
            type="button"
            title={timer.end ? t("entries.editDurationTooltip") : undefined}
            disabled={!timer.end || !onSetDuration}
            onClick={() => {
              if (!timer.end || !onSetDuration) return;
              setDraftDuration(formatTimer(durationOf(timer)));
              setEditingDuration(true);
            }}
            className="w-[58px] text-right font-mono text-sm font-semibold tabular-nums text-gray-700
              enabled:hover:text-accent-600 enabled:hover:underline enabled:cursor-pointer disabled:cursor-default
              dark:text-gray-200 dark:enabled:hover:text-accent-400"
          >
            {formatTimer(durationOf(timer))}
          </button>
        )}
      </div>

      <div className="flex shrink-0 items-center opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
        <button
          type="button"
          title={t("common.resume")}
          disabled={disabled}
          onClick={() => onResume(timer)}
          className="rounded-md p-1.5 text-gray-400 transition hover:bg-gray-200 hover:text-accent-600
            disabled:opacity-40 dark:hover:bg-gray-700 dark:hover:text-accent-400"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
        </button>

        <RowMenu
          disabled={disabled}
          onEdit={() => onEdit(timer)}
          onDuplicate={() => onDuplicate(timer)}
          onSplit={() => onSplit(timer)}
          onDelete={() => onDelete(timer)}
        />
      </div>
    </div>
  );
}

const MENU_W = 168;
const MENU_H = 160;

function RowMenu({
  disabled,
  onEdit,
  onDuplicate,
  onSplit,
  onDelete,
}: {
  disabled?: boolean;
  onEdit: () => void;
  onDuplicate: () => void;
  onSplit: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number }>({
    top: 0,
    left: 0,
  });
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useDismiss(open, [btnRef, menuRef], () => setOpen(false));

  function toggle() {
    const r = btnRef.current?.getBoundingClientRect();
    if (r) setPos(flipPosition(r, MENU_W, MENU_H, "right"));
    setOpen((o) => !o);
  }

  function run(action: () => void) {
    setOpen(false);
    action();
  }

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        title={t("entries.moreActions")}
        disabled={disabled}
        onClick={toggle}
        className={`rounded-md p-1.5 text-gray-400 transition hover:bg-gray-200 hover:text-gray-700
          disabled:opacity-40 dark:hover:bg-gray-700 dark:hover:text-gray-200 ${
            open
              ? "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200"
              : ""
          }`}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="5" r="1.6" />
          <circle cx="12" cy="12" r="1.6" />
          <circle cx="12" cy="19" r="1.6" />
        </svg>
      </button>

      {open &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: "fixed",
              top: pos.top,
              left: pos.left,
              width: MENU_W,
            }}
            className="anim-dropdown z-50 overflow-hidden rounded-lg border border-gray-200 bg-white py-1 text-sm shadow-xl
              dark:border-gray-700 dark:bg-gray-800"
          >
            <MenuItem onClick={() => run(onEdit)}>
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
              </svg>
              {t("common.edit")}
            </MenuItem>
            <MenuItem onClick={() => run(onDuplicate)}>
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="9" y="9" width="11" height="11" rx="2" />
                <path d="M5 15V5a2 2 0 0 1 2-2h10" />
              </svg>
              {t("common.duplicate")}
            </MenuItem>
            <MenuItem onClick={() => run(onSplit)}>
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 3v18M7 8l-4 4 4 4M17 8l4 4-4 4" />
              </svg>
              {t("common.split")}
            </MenuItem>
            <MenuItem onClick={() => run(onDelete)} danger>
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
              </svg>
              {t("common.delete")}
            </MenuItem>
          </div>,
          document.body,
        )}
    </>
  );
}

function MenuItem({
  onClick,
  danger,
  children,
}: {
  onClick: () => void;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 px-3 py-1.5 text-left transition ${
        danger
          ? "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
          : "text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
      }`}
    >
      {children}
    </button>
  );
}
