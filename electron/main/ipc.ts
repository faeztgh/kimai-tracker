import { ipcMain, shell } from "electron";
import { getAutostart, setAutostart } from "./autostart";
import {
  addOrganisation,
  type Connection,
  DEFAULT_SETTINGS,
  getActive,
  listOrganisations,
  type NewOrgInput,
  type OrgPatch,
  type OrgSettings,
  removeOrganisation,
  setActiveOrg,
  setOrgSetting,
  updateOrganisation,
} from "./connection";
import { type KimaiRequest, type KimaiResponse, kimaiFetch } from "./http";
import { setTimerRunning } from "./idle";
import { showNotification, updateReminder } from "./notifications";
import { exportReportPdf } from "./pdf";
import { prefs } from "./prefs";
import { secrets } from "./secrets";
import { refreshTrayMenu, updateTrayStatus } from "./tray";
import {
  broadcast,
  hideFloating,
  pinFloating,
  setTimerRunningIndicator,
  showMain,
  toggleFloating,
} from "./windows";

const NOT_CONNECTED: KimaiResponse = {
  ok: false,
  status: 0,
  statusText: "",
  body: "",
  networkError: "Not connected — configure the server first.",
};

const INVALID_URL: KimaiResponse = {
  ok: false,
  status: 0,
  statusText: "",
  body: "",
  networkError: "Invalid server URL: must start with http:// or https://",
};

const PROTECTED_PREFS = new Set(["organisations", "activeOrgId"]);

const ORG_SETTING_KEYS = new Set(Object.keys(DEFAULT_SETTINGS));

export function registerIpc(): void {
  ipcMain.handle("kimai:request", (_e, req: KimaiRequest) => {
    const conn = getActive();
    return conn ? kimaiFetch(conn, req) : NOT_CONNECTED;
  });
  ipcMain.handle(
    "kimai:requestWith",
    (_e, conn: Connection, req: KimaiRequest) => {
      if (
        typeof conn?.baseUrl !== "string" ||
        !/^https?:\/\//i.test(conn.baseUrl)
      ) {
        return INVALID_URL;
      }
      return kimaiFetch(conn, req);
    },
  );

  ipcMain.handle("org:list", () => listOrganisations());
  ipcMain.handle("org:add", (_e, input: NewOrgInput) => {
    const list = addOrganisation(input);
    broadcast("org:changed");
    return list;
  });
  ipcMain.handle("org:update", (_e, id: string, patch: OrgPatch) => {
    const list = updateOrganisation(id, patch);
    broadcast("org:changed");
    return list;
  });
  ipcMain.handle("org:remove", (_e, id: string) => {
    const list = removeOrganisation(id);
    broadcast("org:changed");
    return list;
  });
  ipcMain.handle("org:setActive", (_e, id: string) => {
    const list = setActiveOrg(id);
    broadcast("org:changed");
    return list;
  });
  ipcMain.handle("org:setSetting", (_e, key: string, value: unknown) => {
    if (!ORG_SETTING_KEYS.has(key)) return listOrganisations();
    const list = setOrgSetting(
      key as keyof OrgSettings,
      value as OrgSettings[keyof OrgSettings],
    );
    broadcast("org:changed");
    return list;
  });
  ipcMain.handle("org:secretBackend", () => secrets.backend());

  ipcMain.handle("prefs:get", (_e, key: string, fallback: unknown) =>
    prefs.get(key, fallback),
  );
  ipcMain.handle("prefs:set", (_e, key: string, value: unknown) => {
    if (typeof key !== "string" || PROTECTED_PREFS.has(key)) return;
    prefs.set(key, value);
    if (key === "fontSize" || key === "fontFamily") {
      broadcast("appearance:changed");
    }
  });

  ipcMain.handle("pdf:export", (_e, html: string, suggestedName: string) =>
    exportReportPdf(html, suggestedName),
  );

  ipcMain.handle("autostart:get", () => getAutostart());
  ipcMain.handle("autostart:set", (_e, enabled: boolean) =>
    setAutostart(enabled),
  );
  ipcMain.handle("shell:openExternal", (_e, url: string) => {
    if (/^https?:\/\//i.test(url)) return shell.openExternal(url);
    return Promise.resolve();
  });

  ipcMain.handle("i18n:setLanguage", (_e, lang: unknown) => {
    if (typeof lang === "string") {
      prefs.set("language", lang);
      refreshTrayMenu(); // re-localize the tray menu immediately
      broadcast("language:changed", lang); // tell every renderer window to switch
    }
  });

  ipcMain.on("windows:toggleFloating", () => toggleFloating());
  ipcMain.on("windows:hideFloating", () => hideFloating());
  ipcMain.on("windows:showMain", () => showMain());
  ipcMain.on("windows:syncData", () => broadcast("data:changed"));
  ipcMain.on("windows:pinFloating", () => pinFloating());

  ipcMain.on("notify", (_e, p: { title?: unknown; body?: unknown }) => {
    if (typeof p?.title === "string" && typeof p?.body === "string") {
      showNotification(p.title, p.body);
    }
  });

  ipcMain.on(
    "tray:setStatus",
    (
      _e,
      status: {
        running: boolean;
        label: string;
        org?: string;
        beginIso?: string | null;
      },
    ) => {
      updateTrayStatus({
        running: status.running,
        label: status.label,
        org: status.org ?? "",
      });
      setTimerRunningIndicator(status.running);
      updateReminder(status.running, status.beginIso ?? null);
      setTimerRunning(status.running);
    },
  );
}
