import { ApiError, request, requestWith } from "./client";
import { monthRangeKimai, recentRangeKimai, toKimaiLocal, toTagStrings } from "../lib/format";
import type {
  Connection,
  KimaiActivity,
  KimaiCustomer,
  KimaiProject,
  KimaiTimesheet,
  KimaiVersion,
} from "./types";

function toId(v: unknown): number {
  if (typeof v === "number") return v;
  if (v && typeof v === "object") {
    const id = (v as { id?: unknown }).id;
    if (typeof id === "number") return id;
  }
  return Number(v);
}

function normTimesheet(t: KimaiTimesheet): KimaiTimesheet {
  return {
    ...t,
    project: toId((t as { project: unknown }).project),
    activity: toId((t as { activity: unknown }).activity),
    tags: toTagStrings((t as { tags?: unknown }).tags),
  };
}

export function testConnection(conn: Connection): Promise<KimaiVersion> {
  return requestWith<KimaiVersion>(conn, "/api/version", { timeoutMs: 10000 });
}

export function getActiveTimesheets(): Promise<KimaiTimesheet[]> {
  return request<KimaiTimesheet[]>("/api/timesheets/active").then((l) => l.map(normTimesheet));
}

export interface EntryFields {
  project: number;
  activity: number;
  description?: string;
  tags?: string[];
  billable?: boolean;
}

function entryBody(fields: EntryFields, extra: Record<string, unknown> = {}) {
  const body: Record<string, unknown> = {
    project: fields.project,
    activity: fields.activity,
    description: fields.description ?? "",
    ...extra,
  };
  if (fields.tags && fields.tags.length) body.tags = fields.tags.join(",");
  if (fields.billable !== undefined) body.billable = fields.billable;
  return body;
}

function isExtraFieldsError(e: unknown): boolean {
  return e instanceof ApiError && /extra fields/i.test(e.message);
}
async function sendTimesheet(
  path: string,
  method: "POST" | "PATCH",
  body: Record<string, unknown>,
): Promise<KimaiTimesheet> {
  try {
    return normTimesheet(await request<KimaiTimesheet>(path, { method, body }));
  } catch (e) {
    if (isExtraFieldsError(e) && "billable" in body) {
      const retry = { ...body };
      delete retry.billable;
      return normTimesheet(await request<KimaiTimesheet>(path, { method, body: retry }));
    }
    throw e;
  }
}

export function startTimer(input: EntryFields): Promise<KimaiTimesheet> {
  return sendTimesheet(
    "/api/timesheets",
    "POST",
    entryBody(input, { begin: toKimaiLocal(new Date()) }),
  );
}

export function createEntry(
  input: EntryFields & { begin: Date; end: Date },
): Promise<KimaiTimesheet> {
  return sendTimesheet(
    "/api/timesheets",
    "POST",
    entryBody(input, {
      begin: toKimaiLocal(input.begin),
      end: toKimaiLocal(input.end),
    }),
  );
}

export interface UpdateEntryInput {
  description?: string;
  project?: number;
  activity?: number;
  begin?: Date;
  end?: Date;
  tags?: string[];
  billable?: boolean;
}

export function updateTimesheet(
  id: number,
  patch: UpdateEntryInput,
): Promise<KimaiTimesheet> {
  const body: Record<string, unknown> = {};
  if (patch.description !== undefined) body.description = patch.description;
  if (patch.project !== undefined) body.project = patch.project;
  if (patch.activity !== undefined) body.activity = patch.activity;
  if (patch.begin) body.begin = toKimaiLocal(patch.begin);
  if (patch.end) body.end = toKimaiLocal(patch.end);
  if (patch.tags !== undefined) body.tags = patch.tags.join(",");
  if (patch.billable !== undefined) body.billable = patch.billable;
  return sendTimesheet(`/api/timesheets/${id}`, "PATCH", body);
}

export function deleteTimesheet(id: number): Promise<void> {
  return request<void>(`/api/timesheets/${id}`, { method: "DELETE" });
}

export function stopTimer(id: number): Promise<KimaiTimesheet> {
  return request<KimaiTimesheet>(`/api/timesheets/${id}/stop`, { method: "PATCH" }).then(normTimesheet);
}

export async function restartTimer(
  id: number,
  source?: KimaiTimesheet,
): Promise<KimaiTimesheet> {
  let restarted: KimaiTimesheet;
  try {
    restarted = normTimesheet(
      await request<KimaiTimesheet>(`/api/timesheets/${id}/restart`, {
        method: "PATCH",
        body: { copy: "all" },
      }),
    );
  } catch (e) {
    if (!isExtraFieldsError(e)) throw e;
    restarted = normTimesheet(
      await request<KimaiTimesheet>(`/api/timesheets/${id}/restart`, { method: "PATCH" }),
    );
  }

  if (!source) return restarted;
  const wantDesc = source.description ?? "";
  const needDesc = !!wantDesc && !(restarted.description ?? "");
  const wantTags = source.tags ?? [];
  const needTags = wantTags.length > 0 && !(restarted.tags?.length);
  if (!needDesc && !needTags) return restarted;

  const patch: UpdateEntryInput = {};
  if (needDesc) patch.description = wantDesc;
  if (needTags) patch.tags = wantTags;
  return updateTimesheet(restarted.id, patch);
}

export function getTags(): Promise<unknown[]> {
  return request<unknown[]>("/api/tags");
}

export function getCustomers(): Promise<KimaiCustomer[]> {
  return request<KimaiCustomer[]>("/api/customers?visible=1");
}

export function getProjects(customerId?: number): Promise<KimaiProject[]> {
  const q = customerId ? `&customer=${customerId}` : "";
  return request<KimaiProject[]>(`/api/projects?visible=1${q}`);
}

export function getActivities(projectId?: number): Promise<KimaiActivity[]> {
  const q = projectId ? `&project=${projectId}&globals=true` : "&globalsOnly=true";
  return request<KimaiActivity[]>(`/api/activities?visible=1${q}`);
}

export function getAllActivities(): Promise<KimaiActivity[]> {
  return request<KimaiActivity[]>("/api/activities?visible=1");
}

export function getRecentTimesheets(days = 7): Promise<KimaiTimesheet[]> {
  const { begin, end } = recentRangeKimai(days);
  const b = encodeURIComponent(begin);
  const e = encodeURIComponent(end);
  return request<KimaiTimesheet[]>(
    `/api/timesheets?begin=${b}&end=${e}&size=200&order=DESC&orderBy=begin`,
  ).then((l) => l.map(normTimesheet));
}

export function getTimesheetsInRange(
  beginIso: string,
  endIso: string,
): Promise<KimaiTimesheet[]> {
  const b = encodeURIComponent(beginIso);
  const e = encodeURIComponent(endIso);
  return request<KimaiTimesheet[]>(
    `/api/timesheets?begin=${b}&end=${e}&size=1000&order=DESC&orderBy=begin`,
  ).then((l) => l.map(normTimesheet));
}

export function getMonthTimesheets(): Promise<KimaiTimesheet[]> {
  const { begin, end } = monthRangeKimai();
  const b = encodeURIComponent(begin);
  const e = encodeURIComponent(end);
  return request<KimaiTimesheet[]>(
    `/api/timesheets?begin=${b}&end=${e}&size=500&order=DESC&orderBy=begin`,
  ).then((l) => l.map(normTimesheet));
}
