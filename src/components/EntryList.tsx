import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { KimaiTimesheet } from "../api/types";
import { useEntityLookup } from "../hooks/useEntities";
import { useEntries, useTimerMutations } from "../hooks/useTimer";
import { dayKey, dayLabel, durationOf } from "../lib/format";
import { useConfirm } from "./ConfirmDialog";
import { DayGroup } from "./DayGroup";
import { EntryEditModal } from "./EntryEditModal";
import { EntryRow } from "./EntryRow";

export function EntryList() {
  const { t } = useTranslation();
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
    return (
      <p className="p-4 text-sm text-gray-400 dark:text-gray-500">
        {t("entries.loadingEntries")}
      </p>
    );
  }
  if (entries.error instanceof Error) {
    return <p className="p-4 text-sm text-red-500">{entries.error.message}</p>;
  }
  if (groups.length === 0) {
    return (
      <p className="p-6 text-center text-sm text-gray-400 dark:text-gray-500">
        {t("entries.noEntries")}
      </p>
    );
  }

  const onResume = (entry: KimaiTimesheet) => restart.mutate(entry);
  const onDelete = async (entry: KimaiTimesheet) => {
    if (
      await confirm({
        title: t("entries.deleteEntry"),
        message: t("entries.deleteEntryMsg"),
        confirmLabel: t("common.delete"),
        danger: true,
      })
    )
      remove.mutate(entry.id);
  };
  const onDuplicate = (entry: KimaiTimesheet) => duplicate.mutate(entry);
  const onSplit = async (entry: KimaiTimesheet) => {
    if (!entry.end) return;
    if (durationOf(entry) < 2) {
      await confirm({
        title: t("entries.cantSplit"),
        message: t("entries.cantSplitMsg"),
        alert: true,
      });
      return;
    }
    split.mutate(entry);
  };

  const onSetDuration = (t: KimaiTimesheet, seconds: number) => {
    const newEnd = new Date(new Date(t.begin).getTime() + seconds * 1000);
    update.mutate({ id: t.id, patch: { end: newEnd } });
  };

  const busy =
    restart.isPending ||
    remove.isPending ||
    duplicate.isPending ||
    split.isPending ||
    update.isPending;

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
              onSetDuration={onSetDuration}
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
            if (
              await confirm({
                title: t("entries.deleteEntry"),
                message: t("entries.deleteEntryMsg"),
                confirmLabel: t("common.delete"),
                danger: true,
              })
            ) {
              remove.mutate(editing.id, { onSuccess: () => setEditing(null) });
            }
          }}
          saving={update.isPending}
        />
      )}
    </>
  );
}
