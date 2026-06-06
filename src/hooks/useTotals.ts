import { useQuery } from "@tanstack/react-query";
import { useActiveTimer, useEntries } from "./useTimer";
import { useTick } from "./useTick";
import { useSettings } from "../store/settings";
import { getMonthTimesheets } from "../api/kimai";
import {
  durationOf,
  isToday,
  secondsSince,
  startOfMonth,
  startOfWeek,
} from "../lib/format";

export interface Totals {
  today: number;
  week: number;
  month: number;
}

export function useTotals(): Totals {
  const configured = useSettings((s) => s.configured);
  const orgId = useSettings((s) => s.activeOrgId);
  const weekStartDay = useSettings((s) => s.weekStart);
  const entries = useEntries().data ?? [];
  const active = useActiveTimer().data ?? null;
  useTick(active !== null);

  const monthQuery = useQuery({
    queryKey: ["month-total", orgId],
    queryFn: getMonthTimesheets,
    enabled: configured,
    refetchInterval: 60_000,
    select: (list) => list.reduce((sum, t) => sum + durationOf(t), 0),
  });

  const weekStart = startOfWeek(weekStartDay).getTime();
  const monthStart = startOfMonth().getTime();

  let today = 0;
  let week = 0;
  for (const t of entries) {
    const secs = durationOf(t);
    if (isToday(t.begin)) today += secs;
    if (new Date(t.begin).getTime() >= weekStart) week += secs;
  }

  let month = monthQuery.data ?? 0;

  if (active) {
    const begin = new Date(active.begin).getTime();
    const live = secondsSince(active.begin);
    if (isToday(active.begin)) today += live;
    if (begin >= weekStart) week += live;
    if (begin >= monthStart) month += live;
  }

  return { today, week, month };
}
