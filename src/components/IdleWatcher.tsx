import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useActiveTimer, useTimerMutations } from "../hooks/useTimer";
import { useConfirm } from "./ConfirmDialog";

const pad = (n: number) => String(n).padStart(2, "0");

export function IdleWatcher() {
  const { t } = useTranslation();
  const active = useActiveTimer().data ?? null;
  const { update, start } = useTimerMutations();
  const confirm = useConfirm();

  const ref = useRef({ active, update, start, confirm, t });
  ref.current = { active, update, start, confirm, t };

  useEffect(() => {
    return window.api.on("idle:detected", (payload) => {
      const s = ref.current;
      const { minutes, sinceIso } = (payload ?? {}) as {
        minutes?: number;
        sinceIso?: string;
      };
      const a = s.active;
      if (!a || !sinceIso || !minutes || minutes < 1) return;

      const since = new Date(sinceIso);
      if (Number.isNaN(since.getTime())) return;
      if (since.getTime() <= new Date(a.begin).getTime()) return;

      void (async () => {
        const time = `${pad(since.getHours())}:${pad(since.getMinutes())}`;
        const discard = await s.confirm({
          title: s.t("idle.title", { minutes }),
          message: s.t("idle.message", { time }),
          confirmLabel: s.t("idle.discard"),
          cancelLabel: s.t("idle.keep"),
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
