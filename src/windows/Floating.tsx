import { useEffect } from "react";
import { Logo } from "../components/Logo";
import { Elapsed } from "../components/Elapsed";
import { useActiveTimer, useTimerMutations } from "../hooks/useTimer";
import { useEntityLookup } from "../hooks/useEntities";
import { activeAlias, useSettings } from "../store/settings";
import { hideFloating } from "../lib/windows";

export default function Floating() {
  const loaded = useSettings((s) => s.loaded);
  const configured = useSettings((s) => s.configured);
  const load = useSettings((s) => s.load);
  const alias = useSettings(activeAlias);

  const active = useActiveTimer();
  const lookup = useEntityLookup();
  const { stop } = useTimerMutations();

  useEffect(() => {
    void load();
  }, [load]);

  const timer = active.data ?? null;
  const projectActivityText = timer?`${lookup.project(timer.project)} · ${lookup.activity(timer.activity)}`:''

  return (
    <div className="flex h-full flex-col bg-white text-gray-800 dark:bg-gray-800 dark:text-gray-100">
      <header className="drag-region flex items-center justify-between border-b border-gray-100 px-3 py-2 dark:border-gray-700">
        <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
          <Logo className="h-3.5 w-3.5" />
          {timer && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent-500" />}
          <span className="max-w-[180px] truncate normal-case" title={alias}>{alias}</span>
        </span>
        <button
          type="button"
          title="Hide"
          onClick={() => hideFloating()}
          className="no-drag -mr-1 rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </header>

      <div className="flex flex-1 flex-col justify-center px-3.5 py-2.5">
        {!loaded ? (
          <p className="text-center text-xs text-gray-400 dark:text-gray-500">Loading…</p>
        ) : !configured ? (
          <p className="text-center text-xs text-gray-400 dark:text-gray-500">Open Kimai Tracker to set up.</p>
        ) : active.error instanceof Error ? (
          <p className="truncate text-center text-xs text-red-500">{active.error.message}</p>
        ) : timer ? (
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p
                className={`mb-1 truncate text-sm font-medium leading-tight ${
                  timer.description
                    ? "text-gray-800 dark:text-gray-100"
                    : "italic text-gray-400 dark:text-gray-500"
                }`}
              >
                {timer.description || "(no description)"}
              </p>
              <Elapsed
                begin={timer.begin}
                className="block font-mono text-2xl font-semibold leading-none tabular-nums text-gray-900 dark:text-white"
              />
              <p className=" flex mt-2 items-center gap-1.5 truncate text-[11px] text-gray-500 dark:text-gray-400">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: lookup.color(timer.project) }}
                />
                <span className="truncate " title={projectActivityText}>
                  {projectActivityText}
                </span>
              </p>
            </div>
            <button
              type="button"
              title="Stop timer"
              onClick={() => stop.mutate(timer.id)}
              disabled={stop.isPending}
              className="flex h-8 w-8 -mt-3 shrink-0 items-center justify-center rounded-full bg-red-500 text-white shadow-sm transition hover:bg-red-600 active:scale-95 disabled:opacity-50"
            >
              <span className="h-3 w-3 rounded-[3px] bg-white" />
            </button>
          </div>
        ) : (
          <p className="text-center text-sm text-gray-400 dark:text-gray-500">No timer running</p>
        )}
      </div>
    </div>
  );
}
