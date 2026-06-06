import { useEffect, useRef } from "react";
import { useActiveTimer, useTimerMutations } from "./useTimer";
import { useEntityLookup } from "./useEntities";
import { activeAlias, useSettings } from "../store/settings";

export function useTrayBridge(): void {
  const active = useActiveTimer();
  const lookup = useEntityLookup();
  const { start, stop } = useTimerMutations();
  const defaultProject = useSettings((s) => s.defaultProject);
  const defaultActivity = useSettings((s) => s.defaultActivity);
  const notifyTimer = useSettings((s) => s.notifyTimer);
  const orgAlias = useSettings(activeAlias);

  const timer = active.data ?? null;
  const label = timer ? lookup.project(timer.project) : "";
  const beginIso = timer?.begin ?? null;

  useEffect(() => {
    window.api.tray.setStatus({ running: timer !== null, label, org: orgAlias, beginIso });
  }, [timer, label, orgAlias, beginIso]);

  const ref = useRef({ timer, start, stop, lookup, defaultProject, defaultActivity, notifyTimer });
  ref.current = { timer, start, stop, lookup, defaultProject, defaultActivity, notifyTimer };

  useEffect(() => {
    const offStop = window.api.on("tray:stop-timer", () => {
      const s = ref.current;
      if (s.timer) s.stop.mutate(s.timer.id);
    });
    const offToggle = window.api.on("hotkey:toggle-timer", () => {
      const s = ref.current;
      if (s.timer) {
        const lbl = s.lookup.project(s.timer.project);
        s.stop.mutate(s.timer.id, {
          onSuccess: () => s.notifyTimer && window.api.notify("Timer stopped", lbl),
        });
      } else if (s.defaultProject !== undefined && s.defaultActivity !== undefined) {
        const lbl = `${s.lookup.project(s.defaultProject)} · ${s.lookup.activity(s.defaultActivity)}`;
        s.start.mutate(
          { project: s.defaultProject, activity: s.defaultActivity, description: "", tags: [], billable: true },
          { onSuccess: () => s.notifyTimer && window.api.notify("Timer started", lbl) },
        );
      } else {
        window.api.windows.showMain();
      }
    });
    return () => {
      offStop();
      offToggle();
    };
  }, []);
}
