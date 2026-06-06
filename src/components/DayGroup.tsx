import type { ReactNode } from "react";
import { formatDurationShort } from "../lib/format";

interface Props {
  label: string;
  totalSeconds: number;
  children: ReactNode;
}

export function DayGroup({ label, totalSeconds, children }: Props) {
  return (
    <section className="border-b-4 border-gray-200/80 last:border-b-0 dark:border-gray-950">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-gray-50/95 px-3.5 py-2 backdrop-blur dark:border-gray-700 dark:bg-gray-900/95">
        <span className="text-sm font-bold text-gray-800 dark:text-gray-100">{label}</span>
        <span className="rounded-md bg-gray-200/80 px-2 py-0.5 font-mono text-xs font-semibold tabular-nums text-gray-600 dark:bg-gray-700/80 dark:text-gray-300">
          {formatDurationShort(totalSeconds)}
        </span>
      </div>
      <div className="divide-y divide-gray-100 bg-white dark:divide-gray-800 dark:bg-gray-900">
        {children}
      </div>
    </section>
  );
}
