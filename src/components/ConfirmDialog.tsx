import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  alert?: boolean;
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within a ConfirmProvider");
  return ctx;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((v: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((o) => {
    setOpts(o);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const settle = (result: boolean) => {
    resolver.current?.(result);
    resolver.current = null;
    setOpts(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {opts && (
        <Dialog
          opts={opts}
          onConfirm={() => settle(true)}
          onCancel={() => settle(false)}
        />
      )}
    </ConfirmContext.Provider>
  );
}

function Dialog({
  opts,
  onConfirm,
  onCancel,
}: {
  opts: ConfirmOptions;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
      else if (e.key === "Enter") onConfirm();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onConfirm, onCancel]);

  return (
    <div
      className="anim-fade-in fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onMouseDown={() => (opts.alert ? onConfirm() : onCancel())}
    >
      <div
        className="anim-pop-in w-full max-w-sm rounded-xl bg-white p-4 shadow-2xl dark:bg-gray-800"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
          {opts.title}
        </h2>
        {opts.message && (
          <p className="mt-1.5 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
            {opts.message}
          </p>
        )}
        <div className="mt-4 flex justify-end gap-2">
          {!opts.alert && (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg px-3 py-1.5 text-sm text-gray-600 transition hover:bg-gray-100
                dark:text-gray-300 dark:hover:bg-gray-700"
            >
              {opts.cancelLabel ?? t("common.cancel")}
            </button>
          )}
          <button
            type="button"
            autoFocus
            onClick={onConfirm}
            className={`rounded-lg px-4 py-1.5 text-sm font-semibold text-white transition active:scale-95 ${
              opts.danger
                ? "bg-red-500 hover:bg-red-600"
                : "bg-accent-500 hover:bg-accent-600"
            }`}
          >
            {opts.confirmLabel ??
              (opts.alert ? t("common.ok") : t("common.confirm"))}
          </button>
        </div>
      </div>
    </div>
  );
}
