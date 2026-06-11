import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createEntry,
  deleteTimesheet,
  type EntryFields,
  getActiveTimesheets,
  getRecentTimesheets,
  restartTimer,
  startTimer,
  stopTimer,
  type UpdateEntryInput,
  updateTimesheet,
} from "../api/kimai";
import type { KimaiTimesheet } from "../api/types";
import { useSettings } from "../store/settings";

function fieldsOf(t: KimaiTimesheet): EntryFields {
  return {
    project: t.project,
    activity: t.activity,
    description: t.description ?? "",
    tags: t.tags,
    billable: t.billable,
  };
}

export function useActiveTimer() {
  const configured = useSettings((s) => s.configured);
  const orgId = useSettings((s) => s.activeOrgId);
  const pollSeconds = useSettings((s) => s.pollSeconds);
  return useQuery({
    queryKey: ["active-timer", orgId],
    queryFn: getActiveTimesheets,
    enabled: configured,
    refetchInterval: pollSeconds * 1000,
    select: (list) => list[0] ?? null,
  });
}

export function useEntries() {
  const configured = useSettings((s) => s.configured);
  const orgId = useSettings((s) => s.activeOrgId);
  return useQuery({
    queryKey: ["entries", orgId],
    queryFn: () => getRecentTimesheets(7),
    enabled: configured,
    refetchInterval: 30_000,
    select: (list) => list.filter((t) => t.end !== null),
  });
}

export function useTimerMutations() {
  const qc = useQueryClient();
  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["active-timer"] });
    void qc.invalidateQueries({ queryKey: ["entries"] });
    void qc.invalidateQueries({ queryKey: ["month-total"] });
    void qc.invalidateQueries({ queryKey: ["report"] });
    window.api.windows.syncData();
  };

  const start = useMutation({
    mutationFn: (input: EntryFields) => startTimer(input),
    onSuccess: invalidate,
  });
  const stop = useMutation({
    mutationFn: (id: number) => stopTimer(id),
    onSuccess: () => {
      // Clear the persisted press-time on any stop path (main, floating, tray).
      void window.api.prefs.set("timerStartedAt", null);
      invalidate();
    },
  });
  const restart = useMutation({
    mutationFn: (t: KimaiTimesheet) => restartTimer(t.id, t),
    onSuccess: (ts) => {
      // Record the resume moment so elapsed counts from ~0:00 in both windows,
      // matching the behaviour of a freshly started timer.
      void window.api.prefs.set("timerStartedAt", {
        id: ts.id,
        ms: Date.now(),
      });
      invalidate();
    },
  });
  const manual = useMutation({
    mutationFn: (input: EntryFields & { begin: Date; end: Date }) =>
      createEntry(input),
    onSuccess: invalidate,
  });
  const update = useMutation({
    mutationFn: ({ id, patch }: { id: number; patch: UpdateEntryInput }) =>
      updateTimesheet(id, patch),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: (id: number) => deleteTimesheet(id),
    onSuccess: invalidate,
  });

  const duplicate = useMutation({
    mutationFn: (t: KimaiTimesheet) =>
      createEntry({
        ...fieldsOf(t),
        begin: new Date(t.begin),
        end: new Date(t.end!),
      }),
    onSuccess: invalidate,
  });

  const split = useMutation({
    mutationFn: async (t: KimaiTimesheet) => {
      const beginMs = new Date(t.begin).getTime();
      const endMs = new Date(t.end!).getTime();
      const mid = new Date((beginMs + endMs) / 2);
      await updateTimesheet(t.id, { end: mid });
      await createEntry({ ...fieldsOf(t), begin: mid, end: new Date(endMs) });
    },
    onSuccess: invalidate,
  });

  return { start, stop, restart, manual, update, remove, duplicate, split };
}
