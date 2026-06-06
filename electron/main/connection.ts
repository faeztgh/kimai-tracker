import { randomUUID } from "node:crypto";
import { prefs } from "./prefs";
import { secrets } from "./secrets";

export type AuthMode = "bearer" | "legacy";

export interface OrgSettings {
  pollSeconds: number;
  accent: string;
  showSummary: boolean;
  weekStart: number;
  showTags: boolean;
  showBillable: boolean;
  notifyTimer: boolean;
  animateDigits: boolean;
  hourlyRate: number;
  currency: string;
  showIncome: boolean;
  defaultProject: number | null;
  defaultActivity: number | null;
  reminderHours: number;
  idleThresholdMinutes: number;
}

export interface Organisation {
  id: string;
  alias: string;
  baseUrl: string;
  authMode: AuthMode;
  username: string;
  settings: OrgSettings;
}

export interface Connection {
  baseUrl: string;
  authMode: AuthMode;
  token: string;
  username?: string;
}

export interface NewOrgInput {
  alias: string;
  baseUrl: string;
  authMode: AuthMode;
  username?: string;
  token: string;
}

export interface OrgPatch {
  alias?: string;
  baseUrl?: string;
  authMode?: AuthMode;
  username?: string;
  token?: string;
}

export interface OrgList {
  organisations: Organisation[];
  activeOrgId: string | null;
}

export const DEFAULT_SETTINGS: OrgSettings = {
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
};

let organisations: Organisation[] = [];
let activeOrgId: string | null = null;

function normalizeBaseUrl(url: string): string {
  const trimmed = url.trim().replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(trimmed)) {
    throw new Error("Server URL must start with http:// or https://");
  }
  return trimmed;
}

function withDefaults(partial?: Partial<OrgSettings>): OrgSettings {
  return { ...DEFAULT_SETTINGS, ...(partial ?? {}) };
}

function sanitize(org: Organisation): Organisation {
  return {
    id: org.id,
    alias: org.alias,
    baseUrl: org.baseUrl,
    authMode: org.authMode === "legacy" ? "legacy" : "bearer",
    username: org.username ?? "",
    settings: withDefaults(org.settings),
  };
}

function persist(): void {
  prefs.set("organisations", organisations);
  prefs.set("activeOrgId", activeOrgId);
}

function findActive(): Organisation | null {
  return organisations.find((o) => o.id === activeOrgId) ?? null;
}

function migrateLegacy(): void {
  const baseUrl = prefs.get<string>("baseUrl", "");
  const token = secrets.readLegacyToken();
  if (!baseUrl || !token) {
    secrets.deleteLegacyToken();
    return;
  }
  const id = randomUUID();
  const settings = withDefaults({
    pollSeconds: prefs.get<number>("pollSeconds", DEFAULT_SETTINGS.pollSeconds),
    accent: prefs.get<string>("accent", DEFAULT_SETTINGS.accent),
    showSummary: prefs.get<boolean>("showSummary", DEFAULT_SETTINGS.showSummary),
    weekStart: prefs.get<number>("weekStart", DEFAULT_SETTINGS.weekStart),
    showTags: prefs.get<boolean>("showTags", DEFAULT_SETTINGS.showTags),
    showBillable: prefs.get<boolean>("showBillable", DEFAULT_SETTINGS.showBillable),
    notifyTimer: prefs.get<boolean>("notifyTimer", DEFAULT_SETTINGS.notifyTimer),
    animateDigits: prefs.get<boolean>("animateDigits", DEFAULT_SETTINGS.animateDigits),
    hourlyRate: prefs.get<number>("hourlyRate", DEFAULT_SETTINGS.hourlyRate),
    currency: prefs.get<string>("currency", DEFAULT_SETTINGS.currency),
    showIncome: prefs.get<boolean>("showIncome", DEFAULT_SETTINGS.showIncome),
    defaultProject: prefs.get<number | null>("defaultProject", null),
    defaultActivity: prefs.get<number | null>("defaultActivity", null),
    reminderHours: prefs.get<number>("reminderHours", DEFAULT_SETTINGS.reminderHours),
    idleThresholdMinutes: prefs.get<number>(
      "idleThresholdMinutes",
      DEFAULT_SETTINGS.idleThresholdMinutes,
    ),
  });
  const org: Organisation = {
    id,
    alias: "Kimai",
    baseUrl: normalizeBaseUrl(baseUrl),
    authMode: prefs.get<AuthMode>("authMode", "bearer"),
    username: prefs.get<string>("username", ""),
    settings,
  };
  organisations = [org];
  activeOrgId = id;
  secrets.setToken(id, token);
  secrets.deleteLegacyToken();
  for (const key of [
    "baseUrl", "authMode", "username", "pollSeconds", "accent", "showSummary",
    "weekStart", "showTags", "showBillable", "notifyTimer", "animateDigits",
    "hourlyRate", "currency", "showIncome", "defaultProject", "defaultActivity",
    "reminderHours", "idleThresholdMinutes",
  ]) {
    prefs.delete(key);
  }
  persist();
}

export function loadOrganisations(): void {
  const stored = prefs.get<Organisation[]>("organisations", []);
  organisations = Array.isArray(stored) ? stored.map(sanitize) : [];
  activeOrgId = prefs.get<string | null>("activeOrgId", null);

  if (organisations.length === 0) {
    migrateLegacy();
  }

  if (!findActive()) {
    activeOrgId = organisations[0]?.id ?? null;
    persist();
  }
}

export function getActive(): Connection | null {
  const org = findActive();
  if (!org) return null;
  const token = secrets.getToken(org.id);
  if (!token) return null;
  return {
    baseUrl: org.baseUrl,
    authMode: org.authMode,
    username: org.username || undefined,
    token,
  };
}

export function getActiveSettings(): OrgSettings | null {
  return findActive()?.settings ?? null;
}

export function getActiveOrgId(): string | null {
  return activeOrgId;
}

export function listOrganisations(): OrgList {
  return { organisations: organisations.map(sanitize), activeOrgId };
}

export function addOrganisation(input: NewOrgInput): OrgList {
  const id = randomUUID();
  const org: Organisation = {
    id,
    alias: input.alias.trim() || "Kimai",
    baseUrl: normalizeBaseUrl(input.baseUrl),
    authMode: input.authMode === "legacy" ? "legacy" : "bearer",
    username: input.username?.trim() ?? "",
    settings: withDefaults(),
  };
  organisations.push(org);
  secrets.setToken(id, input.token);
  if (!activeOrgId) activeOrgId = id;
  persist();
  return listOrganisations();
}

export function updateOrganisation(id: string, patch: OrgPatch): OrgList {
  const org = organisations.find((o) => o.id === id);
  if (!org) return listOrganisations();
  if (patch.alias !== undefined) org.alias = patch.alias.trim() || org.alias;
  if (patch.baseUrl !== undefined) org.baseUrl = normalizeBaseUrl(patch.baseUrl);
  if (patch.authMode !== undefined) {
    org.authMode = patch.authMode === "legacy" ? "legacy" : "bearer";
  }
  if (patch.username !== undefined) org.username = patch.username.trim();
  if (patch.token !== undefined && patch.token.trim()) {
    secrets.setToken(id, patch.token.trim());
  }
  persist();
  return listOrganisations();
}

export function removeOrganisation(id: string): OrgList {
  organisations = organisations.filter((o) => o.id !== id);
  secrets.deleteToken(id);
  if (activeOrgId === id) {
    activeOrgId = organisations[0]?.id ?? null;
  }
  persist();
  return listOrganisations();
}

export function setActiveOrg(id: string): OrgList {
  if (organisations.some((o) => o.id === id)) {
    activeOrgId = id;
    persist();
  }
  return listOrganisations();
}

export function setOrgSetting<K extends keyof OrgSettings>(
  key: K,
  value: OrgSettings[K],
): OrgList {
  const org = findActive();
  if (org) {
    org.settings = { ...org.settings, [key]: value };
    persist();
  }
  return listOrganisations();
}

export function clearOrganisations(): void {
  organisations = [];
  activeOrgId = null;
  secrets.deleteAll();
  prefs.delete("organisations");
  prefs.delete("activeOrgId");
}
