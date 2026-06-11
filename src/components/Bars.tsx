import { useTranslation } from "react-i18next";
import { formatDurationShort } from "../lib/format";

export interface BarItem {
  label: string;
  color: string;
  seconds: number;
  money?: string;
}

export function BarList({
  items,
  total,
}: {
  items: BarItem[];
  total?: number;
}) {
  const { t } = useTranslation();
  if (items.length === 0) {
    return (
      <p className="text-sm text-gray-400 dark:text-gray-500">
        {t("common.noData")}
      </p>
    );
  }
  const max = Math.max(1, ...items.map((i) => i.seconds));
  return (
    <div className="space-y-2.5">
      {items.map((item, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: static positional list
        <div key={i} className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: item.color }}
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <span className="truncate text-xs text-gray-700 dark:text-gray-300">
                {item.label}
              </span>
              <span className="shrink-0 font-mono flex gap-x-2 text-xs tabular-nums text-gray-500 dark:text-gray-400">
                {total && total > 0 && (
                  <span className="mr-1.5 text-gray-400 dark:text-gray-500">
                    {Math.round((item.seconds / total) * 100)}%
                  </span>
                )}
                {formatDurationShort(item.seconds)}
                {` `}
                {item.money && (
                  <p className=" font-semibold text-accent-600 dark:text-accent-400">
                    {item.money}
                  </p>
                )}
              </span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
              <div
                className="h-full rounded-full transition-[width] duration-500 ease-out"
                style={{
                  width: `${(item.seconds / max) * 100}%`,
                  backgroundColor: item.color,
                }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function DayBars({
  days,
  labelFn,
  money,
}: {
  days: { key: string; seconds: number }[];
  labelFn: (key: string) => string;
  money?: (seconds: number) => string;
}) {
  const max = Math.max(1, ...days.map((d) => d.seconds));
  return (
    <div className="flex items-end gap-1.5 pt-7">
      {days.map((d) => {
        const isMax = d.seconds > 0 && d.seconds === max;
        return (
          <div
            key={d.key}
            className="group flex flex-1 flex-col items-center gap-1"
            title={
              money && d.seconds > 0
                ? `${formatDurationShort(d.seconds)} · ${money(d.seconds)}`
                : formatDurationShort(d.seconds)
            }
          >
            <div className="flex h-24 w-full items-end">
              <div
                className={`relative w-full rounded-t-md bg-linear-to-t transition-all ${
                  isMax
                    ? "from-accent-600 to-accent-400"
                    : "from-accent-500/70 to-accent-400/70 group-hover:from-accent-600 group-hover:to-accent-500 dark:from-accent-600/80 dark:to-accent-400/80"
                }`}
                style={{
                  height: `${(d.seconds / max) * 100}%`,
                }}
              >
                {d.seconds > 0 && (
                  <span className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-center text-[9px] font-medium leading-tight text-gray-500 opacity-0 transition group-hover:opacity-100 dark:text-gray-400">
                    {formatDurationShort(d.seconds)}
                    {money && (
                      <span className="block font-semibold text-accent-600 dark:text-accent-400">
                        {money(d.seconds)}
                      </span>
                    )}
                  </span>
                )}
              </div>
            </div>
            <span
              className={`text-[9px] ${
                isMax
                  ? "font-semibold text-accent-600 dark:text-accent-400"
                  : "text-gray-400 dark:text-gray-500"
              }`}
            >
              {labelFn(d.key)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
