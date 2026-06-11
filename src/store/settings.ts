import { create } from "zustand";
import type {
  NewOrgInput,
  OrgPatch,
  OrgSettings,
  PublicOrg,
} from "../api/types";
import i18n, { applyDirection } from "../i18n";
import { setFormatLang, setWeekStartDay } from "../lib/format";
import {
  type AccentName,
  setAccent,
  setTheme,
  type ThemeMode,
} from "../lib/theme";

const DEFAULTS: OrgSettings = {
  pollSeconds: 12,
  accent: "blue",
  showSummary: true,
  weekStart: 1,
  showTags: true,
  showBillable: true,
  notifyTimer: true,
  animateDigits: true,
  hourlyRate: 0,
  currency: "€",
  showIncome: true,
  defaultProject: null,
  defaultActivity: null,
  reminderHours: 8,
  idleThresholdMinutes: 10,
  targetCurrency: "",
  exchangeRate: 0,
};

interface SettingsState {
  loaded: boolean;
  configured: boolean;
  organisations: PublicOrg[];
  activeOrgId: string | null;
  themeMode: ThemeMode;
  language: string;

  pollSeconds: number;
  accent: AccentName;
  showSummary: boolean;
  weekStart: number;
  showTags: boolean;
  showBillable: boolean;
  notifyTimer: boolean;
  animateDigits: boolean;
  hourlyRate: number;
  currency: string;
  showIncome: boolean;
  defaultProject?: number;
  defaultActivity?: number;
  reminderHours: number;
  idleThresholdMinutes: number;
  targetCurrency: string;
  exchangeRate: number;

  load: () => Promise<void>;
  addOrg: (input: NewOrgInput) => Promise<void>;
  updateOrg: (id: string, patch: OrgPatch) => Promise<void>;
  removeOrg: (id: string) => Promise<void>;
  switchOrg: (id: string) => Promise<void>;

  setThemeMode: (mode: ThemeMode) => Promise<void>;
  setLanguage: (lang: string) => Promise<void>;
  setPollSeconds: (n: number) => Promise<void>;
  setAccent: (accent: AccentName) => Promise<void>;
  setHourlyRate: (n: number) => Promise<void>;
  setCurrency: (c: string) => Promise<void>;
  setShowIncome: (show: boolean) => Promise<void>;
  setShowSummary: (show: boolean) => Promise<void>;
  setWeekStart: (day: number) => Promise<void>;
  setShowTags: (show: boolean) => Promise<void>;
  setShowBillable: (show: boolean) => Promise<void>;
  setNotifyTimer: (on: boolean) => Promise<void>;
  setAnimateDigits: (on: boolean) => Promise<void>;
  setDefaults: (project?: number, activity?: number) => Promise<void>;
  setReminderHours: (n: number) => Promise<void>;
  setIdleThreshold: (n: number) => Promise<void>;
  setTargetCurrency: (c: string) => Promise<void>;
  setExchangeRate: (n: number) => Promise<void>;
}

const numOrUndef = (v: number | null | undefined): number | undefined =>
  typeof v === "number" ? v : undefined;

function flatten(settings: OrgSettings) {
  return {
    pollSeconds: settings.pollSeconds,
    accent: settings.accent as AccentName,
    showSummary: settings.showSummary,
    weekStart: settings.weekStart,
    showTags: settings.showTags,
    showBillable: settings.showBillable,
    notifyTimer: settings.notifyTimer,
    animateDigits: settings.animateDigits,
    hourlyRate: settings.hourlyRate,
    currency: settings.currency,
    showIncome: settings.showIncome,
    defaultProject: numOrUndef(settings.defaultProject),
    defaultActivity: numOrUndef(settings.defaultActivity),
    reminderHours: settings.reminderHours,
    idleThresholdMinutes: settings.idleThresholdMinutes,
    targetCurrency: settings.targetCurrency,
    exchangeRate: settings.exchangeRate,
  };
}

export const useSettings = create<SettingsState>((set, get) => {
  function applyList(
    organisations: PublicOrg[],
    activeOrgId: string | null,
    themeMode: ThemeMode,
  ): void {
    const active =
      organisations.find((o) => o.id === activeOrgId) ??
      organisations[0] ??
      null;
    const settings = active?.settings ?? DEFAULTS;
    const flat = flatten(settings);

    setTheme(themeMode);
    setAccent(flat.accent);
    setWeekStartDay(flat.weekStart);

    set({
      loaded: true,
      configured: !!active,
      organisations,
      activeOrgId: active?.id ?? null,
      themeMode,
      ...flat,
    });
  }

  async function patchSetting<K extends keyof OrgSettings>(
    key: K,
    value: OrgSettings[K],
  ): Promise<PublicOrg[]> {
    const list = await window.api.org.setSetting(key, value);
    set({ organisations: list.organisations });
    return list.organisations;
  }

  return {
    loaded: false,
    configured: false,
    organisations: [],
    activeOrgId: null,
    themeMode: "system",
    language: "en",
    ...flatten(DEFAULTS),

    load: async () => {
      const list = await window.api.org.list();
      const themeMode = await window.api.prefs.get<ThemeMode>(
        "themeMode",
        "system",
      );
      const lang = await window.api.prefs.get<string>("language", "en");
      if (lang !== i18n.language) await i18n.changeLanguage(lang);
      applyDirection(lang);
      setFormatLang(lang);
      set({ language: lang });
      applyList(list.organisations, list.activeOrgId, themeMode);
    },

    addOrg: async (input) => {
      const list = await window.api.org.add(input);
      applyList(list.organisations, list.activeOrgId, get().themeMode);
    },

    updateOrg: async (id, patch) => {
      const list = await window.api.org.update(id, patch);
      applyList(list.organisations, list.activeOrgId, get().themeMode);
    },

    removeOrg: async (id) => {
      const list = await window.api.org.remove(id);
      applyList(list.organisations, list.activeOrgId, get().themeMode);
    },

    switchOrg: async (id) => {
      const list = await window.api.org.setActive(id);
      applyList(list.organisations, list.activeOrgId, get().themeMode);
    },

    setThemeMode: async (mode) => {
      await window.api.prefs.set("themeMode", mode);
      setTheme(mode);
      set({ themeMode: mode });
    },

    setLanguage: async (lang) => {
      await i18n.changeLanguage(lang);
      applyDirection(lang);
      setFormatLang(lang);
      // Persists the pref AND rebuilds the (main-process) tray menu.
      await window.api.setLanguage(lang);
      set({ language: lang });
    },

    setPollSeconds: async (n) => {
      await patchSetting("pollSeconds", n);
      set({ pollSeconds: n });
    },

    setAccent: async (accent) => {
      await patchSetting("accent", accent);
      setAccent(accent);
      set({ accent });
    },

    setShowSummary: async (show) => {
      await patchSetting("showSummary", show);
      set({ showSummary: show });
    },

    setWeekStart: async (day) => {
      await patchSetting("weekStart", day);
      setWeekStartDay(day);
      set({ weekStart: day });
    },

    setShowTags: async (show) => {
      await patchSetting("showTags", show);
      set({ showTags: show });
    },

    setShowBillable: async (show) => {
      await patchSetting("showBillable", show);
      set({ showBillable: show });
    },

    setNotifyTimer: async (on) => {
      await patchSetting("notifyTimer", on);
      set({ notifyTimer: on });
    },

    setAnimateDigits: async (on) => {
      await patchSetting("animateDigits", on);
      set({ animateDigits: on });
    },

    setHourlyRate: async (n) => {
      await patchSetting("hourlyRate", n);
      set({ hourlyRate: n });
    },

    setCurrency: async (c) => {
      await patchSetting("currency", c);
      set({ currency: c });
    },

    setShowIncome: async (show) => {
      await patchSetting("showIncome", show);
      set({ showIncome: show });
    },

    setDefaults: async (project, activity) => {
      await patchSetting("defaultProject", project ?? null);
      await patchSetting("defaultActivity", activity ?? null);
      set({ defaultProject: project, defaultActivity: activity });
    },

    setReminderHours: async (n) => {
      await patchSetting("reminderHours", n);
      set({ reminderHours: n });
    },

    setIdleThreshold: async (n) => {
      await patchSetting("idleThresholdMinutes", n);
      set({ idleThresholdMinutes: n });
    },

    setTargetCurrency: async (c) => {
      const v = c.slice(0, 4);
      await patchSetting("targetCurrency", v);
      set({ targetCurrency: v });
    },

    setExchangeRate: async (n) => {
      await patchSetting("exchangeRate", n);
      set({ exchangeRate: n });
    },
  };
});

export function activeOrg(state: SettingsState): PublicOrg | null {
  return state.organisations.find((o) => o.id === state.activeOrgId) ?? null;
}

export function activeAlias(state: SettingsState): string {
  return activeOrg(state)?.alias ?? "Kimai Tracker";
}
