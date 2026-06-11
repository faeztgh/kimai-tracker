import { AnimatedNumber } from "./AnimatedNumber";

export function StatTile({
  label,
  value,
  sub,
  sub2,
  primary,
  delta,
}: {
  label: string;
  value: string;
  sub?: string;
  sub2?: string;
  primary?: boolean;
  delta?: number | null;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-2.5 text-center shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-gray-700 dark:bg-gray-800">
      <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
        {label}
      </p>
      <AnimatedNumber
        value={value}
        className={`mt-0.5 block font-mono font-semibold tabular-nums ${
          primary
            ? "text-base text-accent-600 dark:text-accent-400"
            : "text-sm text-gray-800 dark:text-gray-100"
        }`}
      />
      {sub && (
        <AnimatedNumber
          value={sub}
          className="mt-0.5 block font-mono text-xs font-medium tabular-nums text-accent-600 dark:text-accent-400"
        />
      )}
      {sub2 && (
        <AnimatedNumber
          value={sub2}
          className="mt-0.5 block font-mono text-[10px] font-medium tabular-nums text-gray-400 dark:text-gray-500"
        />
      )}
      {delta != null && (
        <p
          className={`text-[10px] font-medium tabular-nums ${
            delta >= 0
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-red-500 dark:text-red-400"
          }`}
        >
          {delta >= 0 ? "▲" : "▼"} {Math.abs(Math.round(delta))}% vs prev
        </p>
      )}
    </div>
  );
}
