// Single source of truth: the same locale files the renderer uses. The main
// process only needs the "tray" subset, but importing the JSON directly keeps
// translations from drifting out of sync with src/i18n/locales/*.json.
import { localeMap } from "../../src/i18n/localeMap";
import { prefs } from "./prefs";

export type MainTranslations = {
  show: string;
  toggleFloating: string;
  stopTimer: string;
  startTimer: string;
  settings: string;
  quit: string;
};

const locales: Record<string, { tray?: Partial<MainTranslations> }> = localeMap;

const fallback = (localeMap.en as { tray?: MainTranslations })
  .tray as MainTranslations;

export function mainT(): MainTranslations {
  const lang = prefs.get<string>("language", "en");
  return { ...fallback, ...(locales[lang]?.tray ?? {}) };
}
