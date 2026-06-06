import { useEffect, useRef, useState } from "react";
import { Picker } from "./Picker";
import { TagSelect } from "./TagSelect";
import { DateTimePicker } from "./DateTimePicker";
import { AnimatedNumber } from "./AnimatedNumber";
import { useConfirm } from "./ConfirmDialog";
import { useActiveTimer, useTimerMutations } from "../hooks/useTimer";
import { useActivityOptions, useProjectOptions } from "../hooks/usePickerData";
import { useEntityLookup, useTags } from "../hooks/useEntities";
import { useSettings } from "../store/settings";
import { useTick } from "../hooks/useTick";
import {
  formatDurationShort,
  formatTimer,
  secondsSince,
  toDatetimeLocalInput,
  toTagStrings,
} from "../lib/format";
import type { UpdateEntryInput } from "../api/kimai";

type Mode = "timer" | "manual";

function defaultManualRange() {
  const end = new Date();
  const begin = new Date(end.getTime() - 60 * 60 * 1000);
  return { begin: toDatetimeLocalInput(begin), end: toDatetimeLocalInput(end) };
}

export function TrackerBar() {
  const active = useActiveTimer().data ?? null;
  const running = active !== null;
  const { start, stop, manual, update, remove } = useTimerMutations();
  const lookup = useEntityLookup();
  const confirm = useConfirm();
  const tagsQuery = useTags();
  const showTags = useSettings((s) => s.showTags);
  const showBillable = useSettings((s) => s.showBillable);
  const notifyTimer = useSettings((s) => s.notifyTimer);
  const defaultProject = useSettings((s) => s.defaultProject);
  const defaultActivity = useSettings((s) => s.defaultActivity);

  const [desc, setDesc] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [billable, setBillable] = useState(true);
  const [projectId, setProjectId] = useState<number | undefined>();
  const [activityId, setActivityId] = useState<number | undefined>();
  const [mode, setMode] = useState<Mode>("timer");
  const [range, setRange] = useState(defaultManualRange);
  const [error, setError] = useState<string | null>(null);
  const [editField, setEditField] = useState<"project" | "activity" | null>(null);
  const [editingTime, setEditingTime] = useState(false);
  const [startDraft, setStartDraft] = useState("");
  const [saved, setSaved] = useState(false);
  const savedTimer = useRef<number | undefined>(undefined);
  const appliedDefaults = useRef(false);
  const descRef = useRef<HTMLInputElement>(null);

  const projects = useProjectOptions();
  const activities = useActivityOptions(projectId);

  useEffect(() => {
    if (active) {
      setDesc(active.description ?? "");
      setTags(toTagStrings(active.tags));
      setBillable(active.billable ?? true);
      setProjectId(active.project);
      setActivityId(active.activity);
    } else {
      setDesc("");
      setTags([]);
      setBillable(true);
    }
    setEditField(null);
    setEditingTime(false);
    setError(null);
  }, [active?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!running && !appliedDefaults.current && projectId === undefined && defaultProject !== undefined) {
      setProjectId(defaultProject);
      setActivityId(defaultActivity);
      appliedDefaults.current = true;
    }
  }, [running, projectId, defaultProject, defaultActivity]);

  useTick(running);

  const canSubmit = projectId !== undefined && activityId !== undefined;

  function focusDesc() {
    requestAnimationFrame(() => descRef.current?.focus());
  }

  function flashSaved() {
    setSaved(true);
    if (savedTimer.current) window.clearTimeout(savedTimer.current);
    savedTimer.current = window.setTimeout(() => setSaved(false), 1800);
  }
  function applyUpdate(patch: UpdateEntryInput) {
    if (!active) return;
    update.mutate({ id: active.id, patch }, { onSuccess: flashSaved });
  }

  function startEditTime() {
    if (!active) return;
    setStartDraft(toDatetimeLocalInput(new Date(active.begin)));
    setEditingTime(true);
  }
  function commitStartTime() {
    setEditingTime(false);
    if (!active) return;
    const parsed = new Date(startDraft);
    if (Number.isNaN(parsed.getTime())) return;
    const ms = Math.min(parsed.getTime(), Date.now());
    if (ms === new Date(active.begin).getTime()) return;
    applyUpdate({ begin: new Date(ms) });
  }

  function commitDescription() {
    if (running && active && desc.trim() !== (active.description ?? "")) {
      applyUpdate({ description: desc.trim() });
    }
  }
  function onTagsChange(next: string[]) {
    setTags(next);
    if (running && active && next.join("") !== toTagStrings(active.tags).join("")) {
      applyUpdate({ tags: next });
    }
  }
  function toggleBillable() {
    const next = !billable;
    setBillable(next);
    if (running && active) applyUpdate({ billable: next });
  }
  function onProjectChange(id: number | undefined) {
    setProjectId(id);
    setActivityId(undefined);
  }
  function onActivityChange(id: number | undefined) {
    setActivityId(id);
    if (running && active && id !== undefined && projectId !== undefined) {
      applyUpdate({ project: projectId, activity: id });
      setEditField(null);
    }
  }

  function entryLabel(p: number | undefined, a: number | undefined, d: string): string {
    return d.trim() || `${lookup.project(p ?? -1)} · ${lookup.activity(a ?? -1)}`;
  }

  async function onDiscard() {
    if (!active) return;
    const ok = await confirm({
      title: "Discard timer?",
      message: "The running timer will be deleted without saving.",
      confirmLabel: "Discard",
      danger: true,
    });
    if (ok) remove.mutate(active.id, { onSuccess: focusDesc });
  }

  function onStop() {
    if (!active) return;
    const label = entryLabel(active.project, active.activity, active.description ?? "");
    const elapsed = formatDurationShort(secondsSince(active.begin));
    stop.mutate(active.id, {
      onSuccess: () => {
        focusDesc();
        if (notifyTimer) window.api.notify("Timer stopped", `${label} — ${elapsed}`);
      },
    });
  }

  function onStart() {
    if (!canSubmit) {
      setError("Pick a project and activity first.");
      return;
    }
    const label = entryLabel(projectId, activityId, desc);
    start.mutate(
      { project: projectId!, activity: activityId!, description: desc.trim(), tags, billable },
      { onSuccess: () => { if (notifyTimer) window.api.notify("Timer started", label); } },
    );
  }
  function onAdd() {
    if (!canSubmit) {
      setError("Pick a project and activity first.");
      return;
    }
    const begin = new Date(range.begin);
    const end = new Date(range.end);
    if (Number.isNaN(begin.getTime()) || Number.isNaN(end.getTime()) || end <= begin) {
      setError("Enter a valid start and end time.");
      return;
    }
    manual.mutate(
      { project: projectId!, activity: activityId!, description: desc.trim(), tags, billable, begin, end },
      { onSuccess: () => { setDesc(""); setTags([]); setRange(defaultManualRange()); } },
    );
  }

  const duration = running
    ? formatTimer(secondsSince(active!.begin))
    : mode === "manual"
      ? formatTimer(Math.max(0, (new Date(range.end).getTime() - new Date(range.begin).getTime()) / 1000))
      : "00:00:00";

  const busy = start.isPending || stop.isPending || manual.isPending || remove.isPending;
  const submitError =
    (start.error ?? manual.error ?? update.error ?? stop.error ?? remove.error) instanceof Error
      ? (start.error ?? manual.error ?? update.error ?? stop.error ?? remove.error)!.message
      : error;

  const segBtn = (m: Mode) =>
    `px-2.5 py-1 capitalize transition ${
      mode === m
        ? "bg-accent-500 text-white"
        : "bg-transparent text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
    }`;

  return (
    <div className="relative z-20 border-b border-gray-200 bg-white px-3.5 py-3 dark:border-gray-800 dark:bg-gray-800">
      <div className="flex items-center gap-2">
        <input
          ref={descRef}
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          onBlur={commitDescription}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              commitDescription();
              if (!running && mode === "timer") onStart();
            }
          }}
          placeholder="What are you working on?"
          className="relative z-10 min-w-0 flex-1 cursor-text bg-transparent text-[15px] font-medium text-gray-800
            placeholder-gray-400 focus:outline-none dark:text-gray-100 dark:placeholder-gray-500"
        />

        <div className="flex shrink-0 items-center gap-2.5">
          {running && (update.isPending || saved) && (
            <span
              className={`flex items-center gap-1 whitespace-nowrap text-xs ${
                update.isPending
                  ? "text-gray-400 dark:text-gray-500"
                  : "text-emerald-600 dark:text-emerald-400"
              }`}
            >
              {update.isPending ? (
                "Saving…"
              ) : (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                  Saved
                </>
              )}
            </span>
          )}
          <div className="flex h-10 items-center justify-end">
            {running && editingTime ? (
              <input
                type="datetime-local"
                autoFocus
                value={startDraft}
                max={toDatetimeLocalInput(new Date())}
                onChange={(e) => setStartDraft(e.target.value)}
                onBlur={commitStartTime}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitStartTime();
                  else if (e.key === "Escape") setEditingTime(false);
                }}
                title="Set the start time"
                className="rounded-md border border-accent-400 bg-white px-1.5 py-1 font-mono text-sm
                  tabular-nums text-gray-800 focus:outline-none dark:bg-gray-700 dark:text-gray-100 dark:[color-scheme:dark]"
              />
            ) : running ? (
              <button
                type="button"
                onClick={startEditTime}
                title="Click to change the start time"
                className="flex h-10 items-center rounded-md px-1.5 transition hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <AnimatedNumber
                  value={duration}
                  className="font-mono text-lg font-semibold leading-none tabular-nums text-gray-800 dark:text-gray-100"
                />
              </button>
            ) : (
              <span className="flex h-10 items-center px-1.5">
                <AnimatedNumber
                  value={duration}
                  className="font-mono text-lg font-semibold leading-none tabular-nums text-gray-800 dark:text-gray-100"
                />
              </span>
            )}
          </div>
          {running ? (
            <>
              <button
                type="button"
                title="Discard (delete without saving)"
                onClick={onDiscard}
                disabled={busy}
                className="flex h-10 w-10 items-center justify-center rounded-full text-gray-400 transition
                  hover:bg-red-50 hover:text-red-600 active:scale-95 disabled:opacity-50
                  dark:hover:bg-red-950/40 dark:hover:text-red-400"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                </svg>
              </button>
              <button
                type="button"
                title="Stop"
                onClick={onStop}
                disabled={busy}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500 text-white shadow-sm transition hover:bg-red-600 active:scale-95 disabled:opacity-50"
              >
                <span className="h-3.5 w-3.5 rounded-[3px] bg-white" />
              </button>
            </>
          ) : mode === "manual" ? (
            <button
              type="button"
              onClick={onAdd}
              disabled={busy}
              className="rounded-lg bg-accent-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-accent-600 active:scale-95 disabled:opacity-50"
            >
              Add
            </button>
          ) : (
            <button
              type="button"
              title="Start"
              onClick={onStart}
              disabled={busy}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-500 text-white shadow-sm transition hover:bg-accent-600 active:scale-95 disabled:opacity-50"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        {running ? (
          <div className="flex items-center gap-1 text-sm">
            {editField === "project" ? (
              <Picker
                options={projects.options}
                value={projectId}
                onChange={(id) => {
                  onProjectChange(id);
                  setEditField("activity");
                }}
                placeholder="Project"
                loading={projects.loading}
                dot
                fit
                defaultOpen
                onClose={() => setEditField(null)}
              />
            ) : (
              <button
                type="button"
                onClick={() => setEditField("project")}
                title="Change project"
                className="flex items-center gap-1.5 rounded-md px-1.5 py-1 transition hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: lookup.color(projectId ?? active!.project) }}
                />
                <span className="font-semibold" style={{ color: lookup.color(projectId ?? active!.project) }}>
                  {lookup.project(projectId ?? active!.project)}
                </span>
              </button>
            )}
            <span className="text-gray-400 dark:text-gray-500">·</span>
            {editField === "activity" ? (
              <Picker
                options={activities.options}
                value={activityId}
                onChange={onActivityChange}
                placeholder="Activity"
                loading={activities.loading}
                dot
                fit
                defaultOpen
                onClose={() => setEditField(null)}
              />
            ) : (
              <button
                type="button"
                onClick={() => setEditField("activity")}
                title="Change activity"
                className="rounded-md px-1.5 py-1 text-gray-600 transition hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                {lookup.activity(activityId ?? active!.activity)}
              </button>
            )}
          </div>
        ) : (
          <>
            <Picker
              options={projects.options}
              value={projectId}
              onChange={onProjectChange}
              placeholder="Project"
              loading={projects.loading}
              dot
              fit
            />
            <Picker
              options={activities.options}
              value={activityId}
              onChange={onActivityChange}
              placeholder="Activity"
              loading={activities.loading}
              dot
              fit
            />
          </>
        )}

        {showTags && (
          <TagSelect
            options={tagsQuery.data ?? []}
            value={tags}
            onChange={onTagsChange}
            loading={tagsQuery.isLoading}
            fit
          />
        )}

        {showBillable && (
          <button
            type="button"
            title={billable ? "Billable" : "Not billable"}
            onClick={toggleBillable}
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-sm font-bold transition ${
              billable
                ? "border-emerald-500 bg-emerald-50 text-emerald-600 dark:border-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
                : "border-gray-300 text-gray-400 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
            }`}
          >
            $
          </button>
        )}

        {!running && (
          <div className="flex overflow-hidden rounded-lg border border-gray-300 text-xs dark:border-gray-600">
            {(["timer", "manual"] as Mode[]).map((m) => (
              <button key={m} type="button" onClick={() => setMode(m)} className={segBtn(m)}>
                {m}
              </button>
            ))}
          </div>
        )}

        {!running && mode === "manual" && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
            <div className="w-[174px]">
              <DateTimePicker
                value={range.begin}
                onChange={(v) => setRange((r) => ({ ...r, begin: v }))}
                placeholder="Start"
              />
            </div>
            <span>→</span>
            <div className="w-[174px]">
              <DateTimePicker
                value={range.end}
                onChange={(v) => setRange((r) => ({ ...r, end: v }))}
                placeholder="End"
              />
            </div>
          </div>
        )}
      </div>

      {submitError && <p className="mt-2 text-xs text-red-500">{submitError}</p>}
    </div>
  );
}
