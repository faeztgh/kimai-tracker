import { useEffect, useRef } from "react";
import { useConfirm } from "./ConfirmDialog";
import { useActiveTimer, useTimerMutations } from "../hooks/useTimer";

const pad = (n: number) => String(n).padStart(2, "0");

export function IdleWatcher() {
  const active = useActiveTimer().data ?? null;
  const { update, start } = useTimerMutations();
  const confirm = useConfirm();

  const ref = useRef({ active, update, start, confirm });
  ref.current = { active, update, start, confirm };

  useEffect(() => {
    return window.api.on("idle:detected", (payload) => {
      const s = ref.current;
      const { minutes, sinceIso } = (payload ?? {}) as { minutes?: number; sinceIso?: string };
      const a = s.active;
      if (!a || !sinceIso || !minutes || minutes < 1) return;

      const since = new Date(sinceIso);
      if (Number.isNaN(since.getTime())) return;
      if (since.getTime() <= new Date(a.begin).getTime()) return;

      void (async () => {
        const discard = await s.confirm({
          title: `Away for ${minutes} min`,
          message: `You were idle since ${pad(since.getHours())}:${pad(since.getMinutes())}. Discard that idle time from the running timer, or keep it?`,
          confirmLabel: "Discard idle",
          cancelLabel: "Keep",
          danger: true,
        });
        if (!discard) return;
        s.update.mutate(
          { id: a.id, patch: { end: since } },
          {
            onSuccess: () =>
              s.start.mutate({
                project: a.project,
                activity: a.activity,
                description: a.description ?? "",
                tags: a.tags ?? [],
                billable: a.billable ?? true,
              }),
          },
        );
      })();
    });
  }, []);

  return null;
}
