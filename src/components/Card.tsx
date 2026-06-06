import type { ReactNode } from "react";

export function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3.5 shadow-sm transition duration-200 hover:shadow-md dark:border-gray-700 dark:bg-gray-800">
      <h2 className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {title}
      </h2>
      {children}
    </div>
  );
}
