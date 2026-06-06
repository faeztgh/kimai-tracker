import { useMemo, useState } from "react";
import { DayGroup } from "./DayGroup";
import { EntryRow } from "./EntryRow";
import { EntryEditModal } from "./EntryEditModal";
import { useConfirm } from "./ConfirmDialog";
import { useEntries, useTimerMutations } from "../hooks/useTimer";
import { useEntityLookup } from "../hooks/useEntities";
import { dayKey, dayLabel, durationOf } from "../lib/format";
import type { KimaiTimesheet } from "../api/types";

const DELETE_CONFIRM = {
  title: "Delete entry?",
  message: "This time entry will be permanently deleted from Kimai.",
  confirmLabel: "Delete",
  danger: true,
} as const;

export function EntryList() {
  const entries = useEntries();
  const lookup = useEntityLookup();
  const confirm = useConfirm();
  const { restart, remove, update, duplicate, split } = useTimerMutations();
  const [editing, setEditing] = useState<KimaiTimesheet | null>(null);

  const groups = useMemo(() => {
    const map = new Map<string, KimaiTimesheet[]>();
    for (const t of entries.data ?? []) {
      const key = dayKey(t.begin);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    }
    return [...map.entries()];
  }, [entries.data]);

  if (entries.isLoading) {
    return <p className="p-4 text-sm text-gray-400 dark:text-gray-500">Loading entries…</p>;
  }
  if (entries.error instanceof Error) {
    return <p className="p-4 text-sm text-red-500">{entries.error.message}</p>;
  }
  if (groups.length === 0) {
    return (
      <p className="p-6 text-center text-sm text-gray-400 dark:text-gray-500">
        No time entries in the last 7 days.
      </p>
    );
  }

  const onResume = (t: KimaiTimesheet) => restart.mutate(t);
  const onDelete = async (t: KimaiTimesheet) => {
    if (await confirm(DELETE_CONFIRM)) remove.mutate(t.id);
  };
  const onDuplicate = (t: KimaiTimesheet) => duplicate.mutate(t);
  const onSplit = async (t: KimaiTimesheet) => {
    if (!t.end) return;
    if (durationOf(t) < 2) {
      await confirm({ title: "Can't split", message: "This entry is too short to split.", alert: true });
      return;
    }
    split.mutate(t);
  };

  const busy =
    restart.isPending ||
    remove.isPending ||
    duplicate.isPending ||
    split.isPending;

  return (
    <>
      {groups.map(([key, list]) => (
        <DayGroup
          key={key}
          label={dayLabel(key)}
          totalSeconds={list.reduce((sum, t) => sum + durationOf(t), 0)}
        >
          {list.map((t) => (
            <EntryRow
              key={t.id}
              timer={t}
              lookup={lookup}
              onResume={onResume}
              onEdit={setEditing}
              onDelete={onDelete}
              onDuplicate={onDuplicate}
              onSplit={onSplit}
              disabled={busy}
            />
          ))}
        </DayGroup>
      ))}

      {editing && (
        <EntryEditModal
          timer={editing}
          onClose={() => setEditing(null)}
          onSave={(patch) => {
            update.mutate(
              { id: editing.id, patch },
              { onSuccess: () => setEditing(null) },
            );
          }}
          onDelete={async () => {
            if (await confirm(DELETE_CONFIRM)) {
              remove.mutate(editing.id, { onSuccess: () => setEditing(null) });
            }
          }}
          saving={update.isPending}
        />
      )}
    </>
  );
}
