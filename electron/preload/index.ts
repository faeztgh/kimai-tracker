import { contextBridge, ipcRenderer, type IpcRendererEvent } from "electron";

type AuthMode = "bearer" | "legacy";

interface Connection {
  baseUrl: string;
  authMode: AuthMode;
  token: string;
  username?: string;
}
interface KimaiRequestInit {
  path: string;
  method?: string;
  body?: unknown;
  timeoutMs?: number;
}
interface KimaiResponse {
  ok: boolean;
  status: number;
  statusText: string;
  body: string;
  networkError?: string;
}
interface NewOrgInput {
  alias: string;
  baseUrl: string;
  authMode: AuthMode;
  username?: string;
  token: string;
}
interface OrgPatch {
  alias?: string;
  baseUrl?: string;
  authMode?: AuthMode;
  username?: string;
  token?: string;
}
type SecretBackend = "unavailable" | "basic" | "secure";
type IncomingChannel =
  | "goto-settings"
  | "tray:stop-timer"
  | "data:changed"
  | "org:changed"
  | "hotkey:toggle-timer"
  | "idle:detected";

const LABEL_FLAG = "--window-label=";
const labelArg = process.argv.find((a) => a.startsWith(LABEL_FLAG));
const windowLabel = labelArg ? labelArg.slice(LABEL_FLAG.length) : "main";

const api = {
  windowLabel,

  kimai: {
    request: (req: KimaiRequestInit): Promise<KimaiResponse> =>
      ipcRenderer.invoke("kimai:request", req),
    requestWith: (conn: Connection, req: KimaiRequestInit): Promise<KimaiResponse> =>
      ipcRenderer.invoke("kimai:requestWith", conn, req),
  },

  org: {
    list: () => ipcRenderer.invoke("org:list"),
    add: (input: NewOrgInput) => ipcRenderer.invoke("org:add", input),
    update: (id: string, patch: OrgPatch) =>
      ipcRenderer.invoke("org:update", id, patch),
    remove: (id: string) => ipcRenderer.invoke("org:remove", id),
    setActive: (id: string) => ipcRenderer.invoke("org:setActive", id),
    setSetting: (key: string, value: unknown) =>
      ipcRenderer.invoke("org:setSetting", key, value),
    secretBackend: (): Promise<SecretBackend> =>
      ipcRenderer.invoke("org:secretBackend"),
  },

  prefs: {
    get: <T>(key: string, fallback: T): Promise<T> =>
      ipcRenderer.invoke("prefs:get", key, fallback),
    set: (key: string, value: unknown): Promise<void> =>
      ipcRenderer.invoke("prefs:set", key, value),
  },

  pdf: {
    export: (html: string, suggestedName: string) =>
      ipcRenderer.invoke("pdf:export", html, suggestedName),
  },

  autostart: {
    get: (): Promise<boolean> => ipcRenderer.invoke("autostart:get"),
    set: (enabled: boolean): Promise<boolean> =>
      ipcRenderer.invoke("autostart:set", enabled),
  },

  windows: {
    toggleFloating: (): void => ipcRenderer.send("windows:toggleFloating"),
    hideFloating: (): void => ipcRenderer.send("windows:hideFloating"),
    showMain: (): void => ipcRenderer.send("windows:showMain"),
    syncData: (): void => ipcRenderer.send("windows:syncData"),
  },

  tray: {
    setStatus: (status: {
      running: boolean;
      label: string;
      org?: string;
      beginIso?: string | null;
    }): void => ipcRenderer.send("tray:setStatus", status),
  },

  notify: (title: string, body: string): void =>
    ipcRenderer.send("notify", { title, body }),

  openExternal: (url: string): Promise<void> =>
    ipcRenderer.invoke("shell:openExternal", url),

  on: (
    channel: IncomingChannel,
    listener: (...args: unknown[]) => void,
  ): (() => void) => {
    const allowed: IncomingChannel[] = [
      "goto-settings",
      "tray:stop-timer",
      "data:changed",
      "org:changed",
      "hotkey:toggle-timer",
      "idle:detected",
    ];
    if (!allowed.includes(channel)) return () => {};
    const handler = (_e: IpcRendererEvent, ...args: unknown[]) =>
      listener(...args);
    ipcRenderer.on(channel, handler);
    return () => ipcRenderer.removeListener(channel, handler);
  },
};

contextBridge.exposeInMainWorld("api", api);
