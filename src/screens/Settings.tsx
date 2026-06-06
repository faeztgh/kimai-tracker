import { useEffect, useState } from "react";
import { Picker } from "../components/Picker";
import { OrgManager } from "../components/OrgManager";
import {
  Inline,
  NumberInput,
  Section,
  SegmentedControl,
  Stacked,
  Switch,
} from "../components/ui";
import { useSettings } from "../store/settings";
import { useActivityOptions, useProjectOptions } from "../hooks/usePickerData";
import { ACCENTS, type ThemeMode } from "../lib/theme";

interface Props {
  onBack: () => void;
}

type SecretBackend = "unavailable" | "basic" | "secure" | null;

const WEEK_START_OPTIONS = [
  { id: 0, label: "Sunday" },
  { id: 1, label: "Monday" },
  { id: 2, label: "Tuesday" },
  { id: 3, label: "Wednesday" },
  { id: 4, label: "Thursday" },
  { id: 5, label: "Friday" },
  { id: 6, label: "Saturday" },
];

const THEME_OPTIONS: { id: ThemeMode; label: string }[] = [
  { id: "system", label: "system" },
  { id: "light", label: "light" },
  { id: "dark", label: "dark" },
];

export function Settings({ onBack }: Props) {
  const {
    pollSeconds,
    setPollSeconds,
    themeMode,
    setThemeMode,
    accent,
    setAccent,
    showSummary,
    setShowSummary,
    weekStart,
    setWeekStart,
    showTags,
    setShowTags,
    showBillable,
    setShowBillable,
    notifyTimer,
    setNotifyTimer,
    animateDigits,
    setAnimateDigits,
    hourlyRate,
    setHourlyRate,
    currency,
    setCurrency,
    showIncome,
    setShowIncome,
    defaultProject,
    defaultActivity,
    setDefaults,
    reminderHours,
    setReminderHours,
    idleThresholdMinutes,
    setIdleThreshold,
  } = useSettings();

  const [autostart, setAutostart] = useState<boolean | null>(null);
  const [secretBackend, setSecretBackend] = useState<SecretBackend>(null);

  const projects = useProjectOptions();
  const activities = useActivityOptions(defaultProject);

  useEffect(() => {
    window.api.autostart.get().then(setAutostart).catch(() => setAutostart(false));
    window.api.org
      .secretBackend()
      .then(setSecretBackend)
      .catch(() => setSecretBackend(null));
  }, []);

  async function toggleAutostart(v: boolean) {
    try {
      setAutostart(await window.api.autostart.set(v));
    } catch {
      void 0;
    }
  }

  return (
    <div className="flex h-full flex-col bg-gray-100 dark:bg-gray-900">
      <header className="flex items-center gap-2 border-b border-gray-200 bg-white px-3.5 py-2.5 dark:border-gray-800 dark:bg-gray-800">
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200"
          title="Back"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <h1 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Settings</h1>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-md space-y-5 p-4">
          <Section title="Organisations">
            <OrgManager />
            {(secretBackend === "basic" || secretBackend === "unavailable") && (
              <div className="px-3 py-2.5">
                <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-700/60 dark:bg-amber-900/30 dark:text-amber-300">
                  No OS keyring detected — your API tokens are stored with weak encryption.
                  Install a keyring (e.g. gnome-keyring / libsecret) for secure storage.
                </p>
              </div>
            )}
          </Section>

          <Section title="Appearance">
            <Stacked label="Theme" hint="Shared across all organisations.">
              <SegmentedControl
                options={THEME_OPTIONS}
                value={themeMode}
                onChange={(m) => void setThemeMode(m)}
                capitalize
              />
            </Stacked>
            <Stacked label="Accent color">
              <div className="flex flex-wrap gap-2">
                {ACCENTS.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    title={a.label}
                    aria-label={a.label}
                    onClick={() => void setAccent(a.id)}
                    style={{ backgroundColor: a.hex }}
                    className={`h-7 w-7 rounded-full transition ${
                      accent === a.id
                        ? "ring-2 ring-offset-2 ring-gray-400 dark:ring-gray-300 dark:ring-offset-gray-800"
                        : "hover:scale-110"
                    }`}
                  />
                ))}
              </div>
            </Stacked>
            <Inline label="Animated digits" hint="Roll timer & income numbers when they change">
              <Switch checked={animateDigits} onChange={(v) => void setAnimateDigits(v)} />
            </Inline>
          </Section>

          <Section title="Defaults">
            <Stacked label="Project & activity" hint="Pre-selected when you start a new entry.">
              <div className="flex gap-2">
                <div className="flex-1">
                  <Picker
                    options={projects.options}
                    value={defaultProject}
                    onChange={(id) => void setDefaults(id, undefined)}
                    placeholder="No default"
                    loading={projects.loading}
                    allowClear
                    dot
                  />
                </div>
                <div className="flex-1">
                  <Picker
                    options={activities.options}
                    value={defaultActivity}
                    onChange={(id) => void setDefaults(defaultProject, id)}
                    placeholder="No default"
                    disabled={defaultProject === undefined}
                    loading={activities.loading}
                    allowClear
                    dot
                  />
                </div>
              </div>
            </Stacked>
            <Stacked label="Start of week" hint="First day used for weekly totals, charts, and the calendar.">
              <Picker
                options={WEEK_START_OPTIONS}
                value={weekStart}
                onChange={(id) => void setWeekStart(id ?? 1)}
                placeholder="Monday"
                searchable={false}
              />
            </Stacked>
          </Section>

          <Section title="Income">
            <Inline label="Hourly rate" hint="Estimates income in Dashboard & Reports">
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={0}
                  step="0.5"
                  value={hourlyRate || ""}
                  placeholder="0"
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    if (Number.isFinite(n) && n >= 0) void setHourlyRate(n);
                  }}
                  className="w-24 rounded-lg border border-gray-300 bg-white px-2 py-1 text-right text-sm text-gray-800
                    focus:border-accent-400 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                />
                <span className="text-xs text-gray-400 dark:text-gray-500">/ hr</span>
              </div>
            </Inline>
            <Inline label="Currency" hint="Symbol or code shown with amounts">
              <input
                value={currency}
                onChange={(e) => void setCurrency(e.target.value.slice(0, 4))}
                className="w-16 rounded-lg border border-gray-300 bg-white px-2 py-1 text-center text-sm text-gray-800
                  focus:border-accent-400 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              />
            </Inline>
            <Inline label="Show income" hint="Display estimated earnings in Dashboard & Reports">
              <Switch checked={showIncome} onChange={(v) => void setShowIncome(v)} />
            </Inline>
          </Section>

          <Section title="General">
            <Inline label="Show time summary" hint="Today / week / month totals at the bottom">
              <Switch checked={showSummary} onChange={(v) => void setShowSummary(v)} />
            </Inline>
            <Inline label="Show tags selector" hint="Tag picker in the tracker bar">
              <Switch checked={showTags} onChange={(v) => void setShowTags(v)} />
            </Inline>
            <Inline label="Show billable toggle" hint="$ toggle in the tracker bar">
              <Switch checked={showBillable} onChange={(v) => void setShowBillable(v)} />
            </Inline>
            <Inline label="Timer notifications" hint="OS notification when a timer starts or stops">
              <Switch checked={notifyTimer} onChange={(v) => void setNotifyTimer(v)} />
            </Inline>
            <Inline label="Launch on startup" hint="Open Kimai Tracker when your computer starts">
              <Switch
                checked={autostart ?? false}
                disabled={autostart === null}
                onChange={toggleAutostart}
              />
            </Inline>
            <Inline label="Polling interval" hint="How often to sync the running timer">
              <NumberInput
                value={pollSeconds}
                min={5}
                max={120}
                unit="sec"
                onChange={(n) => void setPollSeconds(n)}
              />
            </Inline>
            <Inline label="Long-running reminder" hint="Notify after N hours (0 = off)">
              <NumberInput
                value={reminderHours}
                min={0}
                max={24}
                unit="hr"
                onChange={(n) => void setReminderHours(n)}
              />
            </Inline>
            <Inline label="Idle detection" hint="Ask to discard idle time after N min (0 = off)">
              <NumberInput
                value={idleThresholdMinutes}
                min={0}
                max={120}
                unit="min"
                onChange={(n) => void setIdleThreshold(n)}
              />
            </Inline>
          </Section>
        </div>
      </div>

      <footer className="border-t border-gray-200 bg-white px-4 py-2 text-center text-[11px] text-gray-400 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-500">
        Toggle the window with Ctrl/Cmd+Shift+K
      </footer>
    </div>
  );
}
