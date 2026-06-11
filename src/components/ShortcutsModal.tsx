import { useEffect } from "react";
import { useTranslation } from "react-i18next";

interface Props {
  onClose: () => void;
}

function isMac(): boolean {
  return /mac/i.test(navigator.platform);
}

function Key({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex items-center rounded border border-gray-300 bg-gray-100 px-1.5 py-0.5 font-mono text-[11px] text-gray-700 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300">
      {children}
    </kbd>
  );
}

function ShortcutRow({ keys, label }: { keys: string[]; label: string }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
      <span className="flex items-center gap-1">
        {keys.map((k, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static key-combo list
          <span key={i} className="flex items-center gap-0.5">
            {i > 0 && (
              <span className="text-gray-400 dark:text-gray-500 mx-0.5">+</span>
            )}
            <Key>{k}</Key>
          </span>
        ))}
      </span>
    </div>
  );
}

export function ShortcutsModal({ onClose }: Props) {
  const { t } = useTranslation();
  const mod = isMac() ? "⌘" : "Ctrl";

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="anim-fade-in fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onMouseDown={onClose}
    >
      <div
        className="anim-pop-in w-full max-w-sm rounded-xl bg-white p-5 shadow-2xl dark:bg-gray-800"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
            {t("shortcuts.title")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
              {t("shortcuts.sectionGlobal")}
            </p>
            <div className="divide-y divide-gray-100 dark:divide-gray-700/60">
              <ShortcutRow
                keys={[mod, "Shift", "K"]}
                label={t("shortcuts.showHideWindow")}
              />
              <ShortcutRow
                keys={[mod, "Shift", "S"]}
                label={t("shortcuts.startStopTimer")}
              />
            </div>
          </div>
          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
              {t("shortcuts.sectionInApp")}
            </p>
            <div className="divide-y divide-gray-100 dark:divide-gray-700/60">
              <ShortcutRow
                keys={["Enter"]}
                label={t("shortcuts.startSaveDesc")}
              />
              <ShortcutRow
                keys={["Esc"]}
                label={t("shortcuts.cancelInlineEdit")}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
