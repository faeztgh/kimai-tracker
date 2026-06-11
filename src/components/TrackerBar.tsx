import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import type { UpdateEntryInput } from "../api/kimai";
import { useDismiss } from "../hooks/useDismiss";
import { useEntityLookup, useTags } from "../hooks/useEntities";
import { useActivityOptions, useProjectOptions } from "../hooks/usePickerData";
import { useTick } from "../hooks/useTick";
import {
  useActiveTimer,
  useEntries,
  useTimerMutations,
} from "../hooks/useTimer";
import {
  clearTimerStart,
  markTimerStart,
  useTimerStart,
} from "../hooks/useTimerStart";
import {
  formatDurationShort,
  formatTimer,
  secondsSince,
  toDatetimeLocalInput,
  toTagStrings,
} from "../lib/format";
import { useSettings } from "../store/settings";
import { AnimatedNumber } from "./AnimatedNumber";
import { useConfirm } from "./ConfirmDialog";
import { DateTimePicker } from "./DateTimePicker";
import { Picker } from "./Picker";
import { TagSelect } from "./TagSelect";

type Mode = "timer" | "manual";

function defaultManualRange() {
  const end = new Date();
  const begin = new Date(end.getTime() - 60 * 60 * 1000);
  return { begin: toDatetimeLocalInput(begin), end: toDatetimeLocalInput(end) };
}

export function TrackerBar() {
  const { t } = useTranslation();
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
  const [editField, setEditField] = useState<"project" | "activity" | null>(
    null,
  );
  const [editingTime, setEditingTime] = useState(false);
  const [startDraft, setStartDraft] = useState("");
  const [saved, setSaved] = useState(false);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [suggestIdx, setSuggestIdx] = useState(-1);
  const [suggestPos, setSuggestPos] = useState<{
    top: number;
    left: number;
    width: number;
  }>({ top: 0, left: 0, width: 0 });
  const savedTimer = useRef<number | undefined>(undefined);
  const appliedDefaults = useRef(false);
  const startedAt = useRef<{ id: number; ms: number } | null>(null);
  const descRef = useRef<HTMLInputElement>(null);
  const suggestRef = useRef<HTMLDivElement>(null);

  const entries = useEntries();
  const persistedStart = useTimerStart();
  const projects = useProjectOptions();
  const activities = useActivityOptions(projectId);

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset form only when active timer identity changes
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
      startedAt.current = null; // clear on stop
      clearTimerStart(); // forget the shared press moment too
    }
    setEditField(null);
    setEditingTime(false);
    setError(null);
  }, [active?.id]);

  useEffect(() => {
    if (
      !running &&
      !appliedDefaults.current &&
      projectId === undefined &&
      defaultProject !== undefined
    ) {
      setProjectId(defaultProject);
      setActivityId(defaultActivity);
      appliedDefaults.current = true;
    }
  }, [running, projectId, defaultProject, defaultActivity]);

  useTick(running);

  const suggestions = useMemo(() => {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const t of entries.data ?? []) {
      const d = t.description?.trim() ?? "";
      if (!d) continue;
      const key = d.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      if (desc && !key.includes(desc.toLowerCase())) continue;
      result.push(d);
      if (result.length >= 8) break;
    }
    return result;
  }, [entries.data, desc]);

  useDismiss(suggestOpen && suggestions.length > 0, [descRef, suggestRef], () =>
    setSuggestOpen(false),
  );

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
    if (
      running &&
      active &&
      next.join("") !== toTagStrings(active.tags).join("")
    ) {
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

  function entryLabel(
    p: number | undefined,
    a: number | undefined,
    d: string,
  ): string {
    return (
      d.trim() || `${lookup.project(p ?? -1)} · ${lookup.activity(a ?? -1)}`
    );
  }

  async function onDiscard() {
    if (!active) return;
    const ok = await confirm({
      title: t("tracker.discardTitle"),
      message: t("tracker.discardMessage"),
      confirmLabel: t("tracker.discard"),
      danger: true,
    });
    if (ok) remove.mutate(active.id, { onSuccess: focusDesc });
  }

  function onStop() {
    if (!active) return;
    const label = entryLabel(
      active.project,
      active.activity,
      active.description ?? "",
    );
    const elapsed = formatDurationShort(secondsSince(active.begin));
    stop.mutate(active.id, {
      onSuccess: () => {
        focusDesc();
        if (notifyTimer)
          window.api.notify(t("tracker.timerStopped"), `${label} — ${elapsed}`);
      },
    });
  }

  function onStart() {
    if (!canSubmit) {
      setError(t("tracker.pickProjectActivity"));
      return;
    }
    const label = entryLabel(projectId, activityId, desc);
    const pressedMs = Date.now(); // capture exact press moment
    start.mutate(
      {
        project: projectId!,
        activity: activityId!,
        description: desc.trim(),
        tags,
        billable,
      },
      {
        onSuccess: (ts) => {
          startedAt.current = { id: ts.id, ms: pressedMs }; // store for elapsed calc
          void markTimerStart(ts.id, pressedMs); // share with the floating window
          if (notifyTimer) window.api.notify(t("tracker.timerStarted"), label);
        },
      },
    );
  }
  function onAdd() {
    if (!canSubmit) {
      setError(t("tracker.pickProjectActivity"));
      return;
    }
    const begin = new Date(range.begin);
    const end = new Date(range.end);
    if (
      Number.isNaN(begin.getTime()) ||
      Number.isNaN(end.getTime()) ||
      end <= begin
    ) {
      setError(t("tracker.invalidTimeRange"));
      return;
    }
    manual.mutate(
      {
        project: projectId!,
        activity: activityId!,
        description: desc.trim(),
        tags,
        billable,
        begin,
        end,
      },
      {
        onSuccess: () => {
          setDesc("");
          setTags([]);
          setRange(defaultManualRange());
        },
      },
    );
  }

  // Prefer the exact press moment (local ref for an instant 0:00, or the
  // shared persisted value after a restart) over the server-rounded begin.
  const activeId = active?.id;
  const pressMs =
    startedAt.current && startedAt.current.id === activeId
      ? startedAt.current.ms
      : persistedStart && persistedStart.id === activeId
        ? persistedStart.ms
        : undefined;
  const duration = running
    ? formatTimer(
        pressMs !== undefined
          ? Math.max(0, Math.floor((Date.now() - pressMs) / 1000))
          : secondsSince(active!.begin),
      )
    : mode === "manual"
      ? formatTimer(
          Math.max(
            0,
            (new Date(range.end).getTime() - new Date(range.begin).getTime()) /
              1000,
          ),
        )
      : "00:00:00";

  const busy =
    start.isPending || stop.isPending || manual.isPending || remove.isPending;
  const submitError =
    (start.error ??
      manual.error ??
      update.error ??
      stop.error ??
      remove.error) instanceof Error
      ? (start.error ??
          manual.error ??
          update.error ??
          stop.error ??
          remove.error)!.message
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
          onFocus={() => {
            const r = descRef.current?.getBoundingClientRect();
            if (r)
              setSuggestPos({
                top: r.bottom + 4,
                left: r.left,
                width: r.width,
              });
            setSuggestOpen(true);
            setSuggestIdx(-1);
          }}
          onChange={(e) => {
            setDesc(e.target.value);
            const r = descRef.current?.getBoundingClientRect();
            if (r)
              setSuggestPos({
                top: r.bottom + 4,
                left: r.left,
                width: r.width,
              });
            setSuggestOpen(true);
            setSuggestIdx(-1);
          }}
          onBlur={commitDescription}
          onKeyDown={(e) => {
            if (suggestOpen && suggestions.length > 0) {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setSuggestIdx((i) => Math.min(i + 1, suggestions.length - 1));
                return;
              }
              if (e.key === "ArrowUp") {
                e.preventDefault();
                setSuggestIdx((i) => Math.max(i - 1, -1));
                return;
              }
              if (e.key === "Enter" && suggestIdx >= 0) {
                e.preventDefault();
                const chosen = suggestions[suggestIdx];
                setDesc(chosen);
                setSuggestOpen(false);
                setSuggestIdx(-1);
                if (running && active) {
                  update.mutate(
                    { id: active.id, patch: { description: chosen } },
                    { onSuccess: flashSaved },
                  );
                }
                return;
              }
              if (e.key === "Escape") {
                setSuggestOpen(false);
                setSuggestIdx(-1);
                return;
              }
            }
            // existing Enter logic:
            if (e.key === "Enter") {
              commitDescription();
              if (!running && mode === "timer") onStart();
            }
          }}
          placeholder={t("tracker.placeholder")}
          className="relative z-10 min-w-0 flex-1 cursor-text bg-transparent text-[15px] font-medium text-gray-800
            placeholder-gray-400 focus:outline-none dark:text-gray-100 dark:placeholder-gray-500"
        />

        {suggestOpen &&
          suggestions.length > 0 &&
          createPortal(
            <div
              ref={suggestRef}
              style={{
                position: "fixed",
                top: suggestPos.top,
                left: suggestPos.left,
                width: suggestPos.width,
                zIndex: 50,
              }}
              className="anim-dropdown overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800"
            >
              {suggestions.map((s, i) => (
                <button
                  key={s}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault(); // prevent blur before click
                    setDesc(s);
                    setSuggestOpen(false);
                    setSuggestIdx(-1);
                    if (running && active) {
                      update.mutate(
                        { id: active.id, patch: { description: s } },
                        { onSuccess: flashSaved },
                      );
                    }
                  }}
                  className={`flex w-full items-center px-3 py-2 text-left text-sm transition ${
                    i === suggestIdx
                      ? "bg-accent-50 text-accent-700 dark:bg-accent-950/30 dark:text-accent-300"
                      : "text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700"
                  }`}
                >
                  <span className="truncate">{s}</span>
                </button>
              ))}
            </div>,
            document.body,
          )}

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
                t("common.saving")
              ) : (
                <>
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                  {t("common.saved")}
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
                title={t("tracker.setStartTime")}
                className="rounded-md border border-accent-400 bg-white px-1.5 py-1 font-mono text-sm
                  tabular-nums text-gray-800 focus:outline-none dark:bg-gray-700 dark:text-gray-100 dark:[color-scheme:dark]"
              />
            ) : running ? (
              <button
                type="button"
                onClick={startEditTime}
                title={t("tracker.changeStartTime")}
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
                title={t("tracker.discardTooltip")}
                onClick={onDiscard}
                disabled={busy}
                className="flex h-10 w-10 items-center justify-center rounded-full text-gray-400 transition
                  hover:bg-red-50 hover:text-red-600 active:scale-95 disabled:opacity-50
                  dark:hover:bg-red-950/40 dark:hover:text-red-400"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                </svg>
              </button>
              <button
                type="button"
                title={t("tracker.stop")}
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
              {t("tracker.add")}
            </button>
          ) : (
            <button
              type="button"
              title={t("tracker.start")}
              onClick={onStart}
              disabled={busy}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-500 text-white shadow-sm transition hover:bg-accent-600 active:scale-95 disabled:opacity-50"
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
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
                placeholder={t("tracker.projectPlaceholder")}
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
                title={t("tracker.changeProject")}
                className="flex items-center gap-1.5 rounded-md px-1.5 py-1 transition hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{
                    backgroundColor: lookup.color(projectId ?? active!.project),
                  }}
                />
                <span
                  className="font-semibold"
                  style={{ color: lookup.color(projectId ?? active!.project) }}
                >
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
                placeholder={t("tracker.activityPlaceholder")}
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
                title={t("tracker.changeActivity")}
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
              placeholder={t("tracker.projectPlaceholder")}
              loading={projects.loading}
              dot
              fit
            />
            <Picker
              options={activities.options}
              value={activityId}
              onChange={onActivityChange}
              placeholder={t("tracker.activityPlaceholder")}
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
            title={billable ? t("tracker.billable") : t("tracker.notBillable")}
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
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={segBtn(m)}
              >
                {m === "timer"
                  ? t("tracker.modeTimer")
                  : t("tracker.modeManual")}
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
                placeholder={t("editModal.startTime")}
              />
            </div>
            <span>→</span>
            <div className="w-[174px]">
              <DateTimePicker
                value={range.end}
                onChange={(v) => setRange((r) => ({ ...r, end: v }))}
                placeholder={t("editModal.endTime")}
              />
            </div>
          </div>
        )}
      </div>

      {submitError && (
        <p className="mt-2 text-xs text-red-500">{submitError}</p>
      )}
    </div>
  );
}
