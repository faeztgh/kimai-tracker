import "./i18n";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import i18n, { applyDirection } from "./i18n";
import { setFormatLang } from "./lib/format";
import type { FontFamilyId, FontSize } from "./lib/theme";
import { setAccent, setFontFamily, setFontSize, setTheme } from "./lib/theme";
import { useSettings } from "./store/settings";
import Floating from "./windows/Floating";
import "./index.css";

setTheme("system");
setAccent("blue");
setFontSize("default");
setFontFamily("inter");

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

window.api.on("data:changed", () => void queryClient.invalidateQueries());

window.api.on("org:changed", () => {
  void useSettings.getState().load();
  void queryClient.invalidateQueries();
});

window.api.on("appearance:changed", () => {
  void useSettings.getState().applyAppearance();
});

const Root = window.api.windowLabel === "floating" ? Floating : App;

// Apply the saved language BEFORE the first paint so dates/direction don't
// flash in English (i18n initialises to "en", the real language is in prefs).
async function boot() {
  try {
    const lang = await window.api.prefs.get<string>("language", "en");
    if (lang && lang !== i18n.language) await i18n.changeLanguage(lang);
    const fontSize = await window.api.prefs.get<FontSize>(
      "fontSize",
      "default",
    );
    const fontFamily = await window.api.prefs.get<FontFamilyId>(
      "fontFamily",
      "inter",
    );
    setFontSize(fontSize);
    setFontFamily(fontFamily);
  } catch {
    // fall through with the default language
  }
  applyDirection(i18n.language);
  setFormatLang(i18n.language);

  ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <Root />
      </QueryClientProvider>
    </React.StrictMode>,
  );
}

void boot();
