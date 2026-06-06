import type {
  Connection,
  NewOrgInput,
  OrgList,
  OrgPatch,
} from "./api/types";

export interface KimaiRequestInit {
  path: string;
  method?: string;
  body?: unknown;
  timeoutMs?: number;
}

export interface KimaiBridgeResponse {
  ok: boolean;
  status: number;
  statusText: string;
  body: string;
  networkError?: string;
}

export type SecretBackend = "unavailable" | "basic" | "secure";

export interface PdfResult {
  ok: boolean;
  canceled?: boolean;
  path?: string;
  error?: string;
}

export interface KimaiApi {
  windowLabel: string;

  kimai: {
    request(req: KimaiRequestInit): Promise<KimaiBridgeResponse>;
    requestWith(
      conn: Connection,
      req: KimaiRequestInit,
    ): Promise<KimaiBridgeResponse>;
  };

  org: {
    list(): Promise<OrgList>;
    add(input: NewOrgInput): Promise<OrgList>;
    update(id: string, patch: OrgPatch): Promise<OrgList>;
    remove(id: string): Promise<OrgList>;
    setActive(id: string): Promise<OrgList>;
    setSetting(key: string, value: unknown): Promise<OrgList>;
    secretBackend(): Promise<SecretBackend>;
  };

  prefs: {
    get<T>(key: string, fallback: T): Promise<T>;
    set(key: string, value: unknown): Promise<void>;
  };

  pdf: {
    export(html: string, suggestedName: string): Promise<PdfResult>;
  };

  autostart: {
    get(): Promise<boolean>;
    set(enabled: boolean): Promise<boolean>;
  };

  windows: {
    toggleFloating(): void;
    hideFloating(): void;
    showMain(): void;
    syncData(): void;
  };

  tray: {
    setStatus(status: {
      running: boolean;
      label: string;
      org?: string;
      beginIso?: string | null;
    }): void;
  };

  notify(title: string, body: string): void;

  openExternal(url: string): Promise<void>;

  on(
    channel:
      | "goto-settings"
      | "tray:stop-timer"
      | "data:changed"
      | "org:changed"
      | "hotkey:toggle-timer"
      | "idle:detected",
    listener: (...args: unknown[]) => void,
  ): () => void;
}

declare global {
  interface Window {
    api: KimaiApi;
  }
}
