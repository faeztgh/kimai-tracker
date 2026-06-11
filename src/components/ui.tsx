import type { ReactNode } from "react";

export const inputClass =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 placeholder-gray-400 " +
  "focus:border-accent-400 focus:outline-none focus:ring-1 focus:ring-accent-400 " +
  "dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-500";

export const numberFieldClass =
  "w-16 rounded-lg border border-gray-300 bg-white px-2 py-1 text-right text-sm text-gray-800 " +
  "focus:border-accent-400 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100";

export function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-1.5 px-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
        {title}
      </h2>
      <div className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:divide-gray-700/60 dark:border-gray-700 dark:bg-gray-800">
        {children}
      </div>
    </section>
  );
}

export function Inline({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2.5">
      <div className="min-w-0">
        <p className="text-sm text-gray-700 dark:text-gray-200">{label}</p>
        {hint && (
          <p className="text-xs text-gray-400 dark:text-gray-500">{hint}</p>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export function Stacked({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="px-3 py-2.5">
      <p className="text-sm text-gray-700 dark:text-gray-200">{label}</p>
      {hint && (
        <p className="mb-2 text-xs text-gray-400 dark:text-gray-500">{hint}</p>
      )}
      <div className={hint ? "" : "mt-2"}>{children}</div>
    </div>
  );
}

export function Switch({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-5 w-9 rounded-full transition disabled:opacity-50 ${
        checked ? "bg-accent-500" : "bg-gray-300 dark:bg-gray-600"
      }`}
    >
      <span
        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${
          checked ? "left-[1.125rem]" : "left-0.5"
        }`}
      />
    </button>
  );
}

export function NumberInput({
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  value: number;
  min?: number;
  max?: number;
  step?: number | string;
  unit?: string;
  onChange: (n: number) => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (!Number.isFinite(n)) return;
          if (min !== undefined && n < min) return;
          if (max !== undefined && n > max) return;
          onChange(n);
        }}
        className={numberFieldClass}
      />
      {unit && (
        <span className="text-xs text-gray-400 dark:text-gray-500">{unit}</span>
      )}
    </div>
  );
}

export function TextField({
  label,
  type = "text",
  value,
  placeholder,
  autoFocus,
  onChange,
}: {
  label: string;
  type?: "text" | "url" | "password";
  value: string;
  placeholder?: string;
  autoFocus?: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
        {label}
      </span>
      <input
        className={`mt-1 ${inputClass}`}
        type={type}
        placeholder={placeholder}
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

type ButtonVariant = "primary" | "secondary" | "danger";

const BUTTON_STYLES: Record<ButtonVariant, string> = {
  primary:
    "bg-accent-500 text-white hover:bg-accent-600 active:scale-[0.99] disabled:opacity-50",
  secondary:
    "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 " +
    "dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600",
  danger:
    "border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50 " +
    "dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-400 dark:hover:bg-red-950/70",
};

export function Button({
  children,
  variant = "primary",
  type = "button",
  disabled,
  onClick,
  className = "",
}: {
  children: ReactNode;
  variant?: ButtonVariant;
  type?: "button" | "submit";
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${BUTTON_STYLES[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

export function SegmentedControl<T extends string | number>({
  options,
  value,
  onChange,
  capitalize,
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
  capitalize?: boolean;
}) {
  return (
    <div className="flex overflow-hidden rounded-lg border border-gray-300 text-sm dark:border-gray-600">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={`flex-1 px-2 py-1.5 transition ${capitalize ? "capitalize" : ""} ${
            value === o.id
              ? "bg-accent-500 text-white"
              : "bg-white text-gray-600 hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
