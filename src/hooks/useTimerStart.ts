import { useEffect, useState } from "react";

export interface TimerStart {
  id: number;
  ms: number;
}

/**
 * The exact client-side moment a timer's Start button was pressed, shared
 * across the main and floating windows via a pref. Kimai rounds the stored
 * `begin` server-side (often to the minute), so reading `begin` back makes the
 * elapsed counter jump 1–2 minutes ahead. We persist the real press time and
 * count from it instead — in both windows.
 */
export function useTimerStart(): TimerStart | null {
  const [start, setStart] = useState<TimerStart | null>(null);
  useEffect(() => {
    let alive = true;
    const refetch = () =>
      void window.api.prefs
        .get<TimerStart | null>("timerStartedAt", null)
        .then((v) => {
          if (alive)
            setStart(
              v && typeof v.id === "number" && Number.isFinite(v.ms) ? v : null,
            );
        });
    refetch();
    const off = window.api.on("data:changed", refetch);
    return () => {
      alive = false;
      off();
    };
  }, []);
  return start;
}

/** Persist the press moment and notify the other window to re-read it. */
export async function markTimerStart(id: number, ms: number): Promise<void> {
  await window.api.prefs.set("timerStartedAt", { id, ms });
  window.api.windows.syncData();
}

/** Forget the persisted press moment (on stop / discard). */
export function clearTimerStart(): void {
  void window.api.prefs.set("timerStartedAt", null);
}
