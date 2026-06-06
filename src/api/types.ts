export interface KimaiVersion {
  version: string;
  versionId?: number;
  candidate?: string;
  semver?: string;
  name?: string;
  copyright?: string;
}

export interface KimaiCustomer {
  id: number;
  name: string;
  number?: string | null;
  visible: boolean;
  color?: string | null;
}

export interface KimaiProject {
  id: number;
  name: string;
  customer: number;
  parentTitle?: string | null;
  visible: boolean;
  color?: string | null;
}

export interface KimaiActivity {
  id: number;
  name: string;
  project?: number | null;
  visible: boolean;
  color?: string | null;
}

export interface KimaiTimesheet {
  id: number;
  begin: string;
  end: string | null;
  duration: number | null;
  description: string | null;
  project: number;
  activity: number;
  tags?: string[];
  billable?: boolean;
  rate?: number;
}

export type AuthMode = "bearer" | "legacy";

export interface Connection {
  baseUrl: string;
  authMode: AuthMode;
  token: string;
  username?: string;
}

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

export interface PublicOrg {
  id: string;
  alias: string;
  baseUrl: string;
  authMode: AuthMode;
  username: string;
  settings: OrgSettings;
}

export interface OrgList {
  organisations: PublicOrg[];
  activeOrgId: string | null;
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
