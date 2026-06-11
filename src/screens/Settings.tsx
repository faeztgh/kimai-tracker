import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { version } from "../../package.json";
import { OrgManager } from "../components/OrgManager";
import { Picker } from "../components/Picker";
import { ShortcutsModal } from "../components/ShortcutsModal";
import {
  Inline,
  NumberInput,
  Section,
  SegmentedControl,
  Stacked,
  Switch,
} from "../components/ui";
import { Constants } from "../constants";
import { useActivityOptions, useProjectOptions } from "../hooks/usePickerData";
import { LANGUAGE_OPTIONS } from "../i18n";
import { ACCENTS, type ThemeMode } from "../lib/theme";
import { useSettings } from "../store/settings";

interface Props {
  onBack: () => void;
}

type SecretBackend = "unavailable" | "basic" | "secure" | null;

export function Settings({ onBack }: Props) {
  const { t } = useTranslation();
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
    targetCurrency,
    setTargetCurrency,
    exchangeRate,
    setExchangeRate,
    defaultProject,
    defaultActivity,
    setDefaults,
    reminderHours,
    setReminderHours,
    idleThresholdMinutes,
    setIdleThreshold,
    language,
    setLanguage,
  } = useSettings();

  const WEEK_START_OPTIONS = [0, 1, 2, 3, 4, 5, 6].map((day) => {
    // Use a fixed reference date where day 0 = Sunday, 1 = Monday, etc.
    // Jan 5 2025 is a Sunday, so Jan 5+day gives the correct weekday
    const d = new Date(2025, 0, 5 + day);
    let label: string;
    try {
      label = new Intl.DateTimeFormat(language, {
        weekday: "long",
      }).format(d);
      label = label.charAt(0).toUpperCase() + label.slice(1);
    } catch {
      const fallback = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ];
      label = fallback[day] ?? "";
    }
    return { id: day, label };
  });

  const THEME_OPTIONS: { id: ThemeMode; label: string }[] = [
    { id: "system", label: t("settings.themeSystem") },
    { id: "light", label: t("settings.themeLight") },
    { id: "dark", label: t("settings.themeDark") },
  ];

  const LANGUAGE_PICKER_OPTIONS = LANGUAGE_OPTIONS.map((l, i) => ({
    id: i,
    label: `${l.nativeLabel} (${l.label})`,
  }));

  const [autostart, setAutostart] = useState<boolean | null>(null);
  const [secretBackend, setSecretBackend] = useState<SecretBackend>(null);
  const [showShortcuts, setShowShortcuts] = useState(false);

  const projects = useProjectOptions();
  const activities = useActivityOptions(defaultProject);

  useEffect(() => {
    window.api.autostart
      .get()
      .then(setAutostart)
      .catch(() => setAutostart(false));
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
          title={t("common.back")}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <h1 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
          {t("settings.title")}
        </h1>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-md space-y-5 p-4">
          <Section title={t("settings.sectionOrgs")}>
            <OrgManager />
            {(secretBackend === "basic" || secretBackend === "unavailable") && (
              <div className="px-3 py-2.5">
                <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-700/60 dark:bg-amber-900/30 dark:text-amber-300">
                  {t("settings.weakEncryptionWarning")}
                </p>
              </div>
            )}
          </Section>

          <Section title={t("settings.sectionAppearance")}>
            <Stacked label={t("settings.theme")} hint={t("settings.themeHint")}>
              <SegmentedControl
                options={THEME_OPTIONS}
                value={themeMode}
                onChange={(m) => void setThemeMode(m)}
                capitalize
              />
            </Stacked>
            <Stacked label={t("settings.accentColor")}>
              <div className="flex flex-wrap gap-2">
                {ACCENTS.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    title={t(`accents.${a.id}`)}
                    aria-label={t(`accents.${a.id}`)}
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
            <Stacked
              label={t("settings.language")}
              hint={t("settings.languageHint")}
            >
              <Picker
                options={LANGUAGE_PICKER_OPTIONS}
                value={LANGUAGE_OPTIONS.findIndex((l) => l.id === language)}
                onChange={(id) => {
                  const lang = LANGUAGE_OPTIONS[id ?? 0];
                  if (lang) void setLanguage(lang.id);
                }}
                placeholder={t("settings.language")}
                searchable={false}
              />
            </Stacked>
            <Inline
              label={t("settings.animatedDigits")}
              hint={t("settings.animatedDigitsHint")}
            >
              <Switch
                checked={animateDigits}
                onChange={(v) => void setAnimateDigits(v)}
              />
            </Inline>
          </Section>

          <Section title={t("settings.sectionDefaults")}>
            <Stacked
              label={t("settings.projectActivity")}
              hint={t("settings.projectActivityHint")}
            >
              <div className="flex gap-2">
                <div className="flex-1">
                  <Picker
                    options={projects.options}
                    value={defaultProject}
                    onChange={(id) => void setDefaults(id, undefined)}
                    placeholder={t("settings.noDefault")}
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
                    placeholder={t("settings.noDefault")}
                    disabled={defaultProject === undefined}
                    loading={activities.loading}
                    allowClear
                    dot
                  />
                </div>
              </div>
            </Stacked>
            <Stacked
              label={t("settings.startOfWeek")}
              hint={t("settings.startOfWeekHint")}
            >
              <Picker
                options={WEEK_START_OPTIONS}
                value={weekStart}
                onChange={(id) => void setWeekStart(id ?? 1)}
                placeholder={t("weekdays.mon")}
                searchable={false}
              />
            </Stacked>
          </Section>

          <Section title={t("settings.sectionIncome")}>
            <Inline
              label={t("settings.hourlyRate")}
              hint={t("settings.hourlyRateHint")}
            >
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
                  className="w-20 rounded-lg border border-gray-300 bg-white px-2 py-1 text-right text-sm text-gray-800
                    focus:border-accent-400 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                />
                <input
                  value={currency}
                  title={t("settings.currencyHint")}
                  onChange={(e) => void setCurrency(e.target.value.slice(0, 4))}
                  className="w-16 rounded-lg border border-gray-300 bg-white px-2 py-1 text-center text-sm text-gray-800
                  focus:border-accent-400 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                />
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {t("settings.secPerHr")}
                </span>
              </div>
            </Inline>
            <Inline
              label={`${t("settings.convertTo")} (${t("settings.exchangeRate")})`}
              hint={`1 ${currency || "base"} = ? ${targetCurrency || "target"}`}
            >
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={0}
                  step="0.001"
                  value={exchangeRate || ""}
                  placeholder="1.0"
                  title={t("settings.exchangeRate")}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    if (Number.isFinite(n) && n >= 0) void setExchangeRate(n);
                  }}
                  className="w-20 rounded-lg border border-gray-300 bg-white px-2 py-1 text-right text-sm text-gray-800
                    focus:border-accent-400 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                />
                <input
                  value={targetCurrency}
                  title={t("settings.convertToHint")}
                  onChange={(e) =>
                    void setTargetCurrency(e.target.value.slice(0, 4))
                  }
                  placeholder="USD"
                  className="w-16 rounded-lg border border-gray-300 bg-white px-2 py-1 text-center text-sm text-gray-800
                  focus:border-accent-400 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                />
              </div>
            </Inline>
            <Inline
              label={t("settings.showIncome")}
              hint={t("settings.showIncomeHint")}
            >
              <Switch
                checked={showIncome}
                onChange={(v) => void setShowIncome(v)}
              />
            </Inline>
          </Section>

          <Section title={t("settings.sectionGeneral")}>
            <Inline
              label={t("settings.showSummary")}
              hint={t("settings.showSummaryHint")}
            >
              <Switch
                checked={showSummary}
                onChange={(v) => void setShowSummary(v)}
              />
            </Inline>
            <Inline
              label={t("settings.showTags")}
              hint={t("settings.showTagsHint")}
            >
              <Switch
                checked={showTags}
                onChange={(v) => void setShowTags(v)}
              />
            </Inline>
            <Inline
              label={t("settings.showBillable")}
              hint={t("settings.showBillableHint")}
            >
              <Switch
                checked={showBillable}
                onChange={(v) => void setShowBillable(v)}
              />
            </Inline>
            <Inline
              label={t("settings.timerNotifications")}
              hint={t("settings.timerNotificationsHint")}
            >
              <Switch
                checked={notifyTimer}
                onChange={(v) => void setNotifyTimer(v)}
              />
            </Inline>
            <Inline
              label={t("settings.launchOnStartup")}
              hint={t("settings.launchOnStartupHint")}
            >
              <Switch
                checked={autostart ?? false}
                disabled={autostart === null}
                onChange={toggleAutostart}
              />
            </Inline>
            <Inline
              label={t("settings.pollingInterval")}
              hint={t("settings.pollingIntervalHint")}
            >
              <NumberInput
                value={pollSeconds}
                min={5}
                max={120}
                unit={t("settings.secUnit")}
                onChange={(n) => void setPollSeconds(n)}
              />
            </Inline>
            <Inline
              label={t("settings.longRunningReminder")}
              hint={t("settings.longRunningReminderHint")}
            >
              <NumberInput
                value={reminderHours}
                min={0}
                max={24}
                unit={t("settings.hrUnit")}
                onChange={(n) => void setReminderHours(n)}
              />
            </Inline>
            <Inline
              label={t("settings.idleDetection")}
              hint={t("settings.idleDetectionHint")}
            >
              <NumberInput
                value={idleThresholdMinutes}
                min={0}
                max={120}
                unit={t("settings.minUnit")}
                onChange={(n) => void setIdleThreshold(n)}
              />
            </Inline>
            <Inline
              label={t("settings.keyboardShortcuts")}
              hint={t("settings.keyboardShortcutsHint")}
            >
              <button
                type="button"
                onClick={() => setShowShortcuts(true)}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 transition
                  hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                {t("settings.viewShortcuts")}
              </button>
            </Inline>
          </Section>
        </div>
        <div className="flex flex-col pb-3 items-center justify-center">
          <button
            type="button"
            onClick={() =>
              void window.api.openExternal(
                "https://www.faez.pro/support?utm_source=kimai-tracker&utm_medium=settings&utm_campaign=donate",
              )
            }
            className="py-3 max-w-fit px-6 text-center font-bold tracking-wider text-xl w-full rounded bg-accent-500 text-white hover:bg-accent-600 active:scale-[0.99] disabled:opacity-50"
          >
            {t("settings.donate")}
          </button>
        </div>
      </div>

      <footer className="border-t flex items-center justify-center  border-gray-200 bg-white px-4 py-2 text-center text-[11px] text-gray-400 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-500">
        <button
          type="button"
          onClick={() => void window.api.openExternal(Constants.APP_REPO_URL)}
          title={t("settings.versionTooltip")}
          className=" gap-1 text-center flex text-xs text-gray-400 hover:underline dark:text-gray-500"
        >
          <p>{t("settings.version")} </p>
          <code>{version}</code>
        </button>
      </footer>
      {showShortcuts && (
        <ShortcutsModal onClose={() => setShowShortcuts(false)} />
      )}
    </div>
  );
}
