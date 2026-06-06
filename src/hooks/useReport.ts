import { useQuery } from "@tanstack/react-query";
import { getTimesheetsInRange } from "../api/kimai";
import { useSettings } from "../store/settings";
import { dayKey, dayKeysBetween, durationOf, toKimaiLocal } from "../lib/format";
import type { KimaiTimesheet } from "../api/types";

export interface ReportResult {
  isLoading: boolean;
  error: unknown;
  total: number;
  billableTotal: number;
  count: number;
  entries: KimaiTimesheet[];
  byProject: { projectId: number; seconds: number }[];
  byActivity: { activityId: number; seconds: number }[];
  byTag: { tag: string; seconds: number }[];
  byDay: { key: string; seconds: number }[];
  activeDays: number;
}

export function useReport(begin: Date, end: Date): ReportResult {
  const configured = useSettings((s) => s.configured);
  const orgId = useSettings((s) => s.activeOrgId);
  const beginIso = toKimaiLocal(begin);
  const endIso = toKimaiLocal(end);

  const query = useQuery({
    queryKey: ["report", orgId, beginIso, endIso],
    queryFn: () => getTimesheetsInRange(beginIso, endIso),
    enabled: configured,
    staleTime: 30_000,
  });

  const entries = query.data ?? [];
  const total = entries.reduce((sum, t) => sum + durationOf(t), 0);

  const projMap = new Map<number, number>();
  const actMap = new Map<number, number>();
  const tagMap = new Map<string, number>();
  const dayMap = new Map<string, number>();
  let billableTotal = 0;
  for (const t of entries) {
    const secs = durationOf(t);
    if (t.billable) billableTotal += secs;
    projMap.set(t.project, (projMap.get(t.project) ?? 0) + secs);
    actMap.set(t.activity, (actMap.get(t.activity) ?? 0) + secs);
    for (const tag of t.tags ?? []) tagMap.set(tag, (tagMap.get(tag) ?? 0) + secs);
    const k = dayKey(t.begin);
    dayMap.set(k, (dayMap.get(k) ?? 0) + secs);
  }

  const byProject = [...projMap.entries()]
    .map(([projectId, seconds]) => ({ projectId, seconds }))
    .sort((a, b) => b.seconds - a.seconds);

  const byActivity = [...actMap.entries()]
    .map(([activityId, seconds]) => ({ activityId, seconds }))
    .sort((a, b) => b.seconds - a.seconds);

  const byTag = [...tagMap.entries()]
    .map(([tag, seconds]) => ({ tag, seconds }))
    .sort((a, b) => b.seconds - a.seconds);

  const byDay = dayKeysBetween(begin, end).map((key) => ({
    key,
    seconds: dayMap.get(key) ?? 0,
  }));

  return {
    isLoading: query.isLoading,
    error: query.error,
    total,
    billableTotal,
    count: entries.length,
    entries,
    byProject,
    byActivity,
    byTag,
    byDay,
    activeDays: byDay.filter((d) => d.seconds > 0).length,
  };
}
