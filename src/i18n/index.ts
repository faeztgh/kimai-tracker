import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { setFormatLang } from "../lib/format";
import { localeMap } from "./localeMap";

export const RTL_LANGS = ["fa", "ar"] as const;
export type SupportedLang =
  | "en"
  | "fa"
  | "de"
  | "es"
  | "ar"
  | "ru"
  | "fr"
  | "it"
  | "pt"
  | "nl"
  | "pl"
  | "tr"
  | "ja"
  | "zh"
  | "uk"
  | "cs"
  | "ko";

export const LANGUAGE_OPTIONS: {
  id: SupportedLang;
  label: string;
  nativeLabel: string;
}[] = [
  { id: "en", label: "English", nativeLabel: "English" },
  { id: "fa", label: "Persian", nativeLabel: "فارسی" },
  { id: "ar", label: "Arabic", nativeLabel: "العربية" },
  { id: "de", label: "German", nativeLabel: "Deutsch" },
  { id: "es", label: "Spanish", nativeLabel: "Español" },
  { id: "zh", label: "Chinese", nativeLabel: "中文" },
  { id: "cs", label: "Czech", nativeLabel: "Čeština" },
  { id: "nl", label: "Dutch", nativeLabel: "Nederlands" },
  { id: "fr", label: "French", nativeLabel: "Français" },
  { id: "it", label: "Italian", nativeLabel: "Italiano" },
  { id: "ja", label: "Japanese", nativeLabel: "日本語" },
  { id: "ko", label: "Korean", nativeLabel: "한국어" },
  { id: "pl", label: "Polish", nativeLabel: "Polski" },
  { id: "pt", label: "Portuguese", nativeLabel: "Português" },
  { id: "ru", label: "Russian", nativeLabel: "Русский" },
  { id: "tr", label: "Turkish", nativeLabel: "Türkçe" },
  { id: "uk", label: "Ukrainian", nativeLabel: "Українська" },
];

export function applyDirection(lng: string): void {
  const isRtl = (RTL_LANGS as readonly string[]).includes(lng);
  document.documentElement.dir = isRtl ? "rtl" : "ltr";
  document.documentElement.lang = lng;
}

i18n.use(initReactI18next).init({
  resources: Object.fromEntries(
    Object.entries(localeMap).map(([k, v]) => [k, { translation: v }]),
  ),
  lng: "en",
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

i18n.on("languageChanged", applyDirection);
i18n.on("languageChanged", setFormatLang);

export { localeMap };
export default i18n;
