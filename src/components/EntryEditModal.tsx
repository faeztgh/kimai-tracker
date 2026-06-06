import { useState } from "react";
import { Picker } from "./Picker";
import { DateTimePicker } from "./DateTimePicker";
import { TagSelect } from "./TagSelect";
import { useActivityOptions, useProjectOptions } from "../hooks/usePickerData";
import { useTags } from "../hooks/useEntities";
import { useSettings } from "../store/settings";
import { toDatetimeLocalInput, toTagStrings } from "../lib/format";
import type { UpdateEntryInput } from "../api/kimai";
import type { KimaiTimesheet } from "../api/types";

interface Props {
  timer: KimaiTimesheet;
  onClose: () => void;
  onSave: (patch: UpdateEntryInput) => void;
  onDelete: () => void;
  saving: boolean;
}

const labelCls = "text-xs font-medium text-gray-500 dark:text-gray-400";
const field =
  "w-full rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-800 " +
  "focus:border-accent-400 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100";

export function EntryEditModal({ timer, onClose, onSave, onDelete, saving }: Props) {
  const [desc, setDesc] = useState(timer.description ?? "");
  const [projectId, setProjectId] = useState<number | undefined>(timer.project);
  const [activityId, setActivityId] = useState<number | undefined>(timer.activity);
  const [begin, setBegin] = useState(toDatetimeLocalInput(new Date(timer.begin)));
  const [end, setEnd] = useState(
    timer.end ? toDatetimeLocalInput(new Date(timer.end)) : "",
  );
  const [tags, setTags] = useState<string[]>(toTagStrings(timer.tags));
  const [error, setError] = useState<string | null>(null);

  const projects = useProjectOptions();
  const activities = useActivityOptions(projectId);
  const tagsQuery = useTags();
  const showTags = useSettings((s) => s.showTags);

  function save() {
    if (projectId === undefined || activityId === undefined) {
      setError("Project and activity are required.");
      return;
    }
    const beginDate = new Date(begin);
    const endDate = end ? new Date(end) : undefined;
    if (Number.isNaN(beginDate.getTime())) {
      setError("Invalid start time.");
      return;
    }
    if (endDate && endDate <= beginDate) {
      setError("End must be after start.");
      return;
    }
    onSave({
      description: desc.trim(),
      project: projectId,
      activity: activityId,
      begin: beginDate,
      end: endDate,
      tags,
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onMouseDown={onClose}
    >
      <div
        className="max-h-[calc(100vh-2rem)] w-full max-w-lg space-y-3 overflow-y-auto rounded-xl bg-white p-4 shadow-2xl dark:bg-gray-800"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Edit entry</h2>

        <div>
          <span className={labelCls}>Description</span>
          <input
            className={`mt-1 ${field}`}
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="(no description)"
            autoFocus
          />
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div className="min-w-0">
            <span className={labelCls}>Project</span>
            <div className="mt-1">
              <Picker
                options={projects.options}
                value={projectId}
                onChange={(id) => {
                  setProjectId(id);
                  setActivityId(undefined);
                }}
                placeholder="Project"
                loading={projects.loading}
                dot
              />
            </div>
          </div>
          <div className="min-w-0">
            <span className={labelCls}>Activity</span>
            <div className="mt-1">
              <Picker
                options={activities.options}
                value={activityId}
                onChange={setActivityId}
                placeholder="Activity"
                disabled={projectId === undefined}
                loading={activities.loading}
                dot
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div className="min-w-0">
            <span className={labelCls}>Start</span>
            <div className="mt-1">
              <DateTimePicker value={begin} onChange={setBegin} placeholder="Start" />
            </div>
          </div>
          <div className="min-w-0">
            <span className={labelCls}>End</span>
            <div className="mt-1">
              <DateTimePicker value={end} onChange={setEnd} placeholder="Running (no end)" />
            </div>
          </div>
        </div>

        {showTags && (
          <div>
            <span className={labelCls}>Tags</span>
            <div className="mt-1">
              <TagSelect
                options={tagsQuery.data ?? []}
                value={tags}
                onChange={setTags}
                loading={tagsQuery.isLoading}
              />
            </div>
          </div>
        )}

        {error && <p className="text-xs text-red-500">{error}</p>}

        <div className="flex items-center justify-between pt-1">
          <button
            type="button"
            onClick={onDelete}
            className="text-sm font-medium text-red-500 hover:text-red-600"
          >
            Delete
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100
                dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="rounded-lg bg-accent-500 px-4 py-1.5 text-sm font-semibold text-white
                transition hover:bg-accent-600 active:scale-95 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
