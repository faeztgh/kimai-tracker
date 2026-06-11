import { useTranslation } from "react-i18next";
import { type BarItem, BarList, DayBars } from "../components/Bars";
import { Card } from "../components/Card";
import { Elapsed } from "../components/Elapsed";
import { StatTile } from "../components/StatTile";
import { useEntityLookup } from "../hooks/useEntities";
import { useIncome } from "../hooks/useIncome";
import {
  useActiveTimer,
  useEntries,
  useTimerMutations,
} from "../hooks/useTimer";
import { useTotals } from "../hooks/useTotals";
import {
  dayKey,
  dayKeysBetween,
  durationOf,
  formatDurationShort,
  secondsSince,
  startOfWeek,
  weekdayShort,
} from "../lib/format";
import { useSettings } from "../store/settings";

export function Dashboard() {
  const { t } = useTranslation();
  const totals = useTotals();
  const entries = useEntries().data ?? [];
  const active = useActiveTimer().data ?? null;
  const lookup = useEntityLookup();
  const { stop } = useTimerMutations();
  const { hasRate, money, hasConversion, moneyConverted } = useIncome();
  const weekStartDay = useSettings((s) => s.weekStart);

  const end = new Date();
  const begin = new Date();
  begin.setDate(begin.getDate() - 6);
  const dayTotals = new Map<string, number>();
  for (const t of entries) {
    const k = dayKey(t.begin);
    dayTotals.set(k, (dayTotals.get(k) ?? 0) + durationOf(t));
  }
  if (active) {
    const k = dayKey(active.begin);
    dayTotals.set(k, (dayTotals.get(k) ?? 0) + secondsSince(active.begin));
  }
  const days = dayKeysBetween(begin, end).map((key) => ({
    key,
    seconds: dayTotals.get(key) ?? 0,
  }));

  const weekStart = startOfWeek(weekStartDay).getTime();
  const proj = new Map<number, number>();
  for (const t of entries) {
    if (new Date(t.begin).getTime() >= weekStart) {
      proj.set(t.project, (proj.get(t.project) ?? 0) + durationOf(t));
    }
  }
  if (active && new Date(active.begin).getTime() >= weekStart) {
    proj.set(
      active.project,
      (proj.get(active.project) ?? 0) + secondsSince(active.begin),
    );
  }
  const projectItems: BarItem[] = [...proj.entries()]
    .map(([id, seconds]) => ({
      label: lookup.project(id),
      color: lookup.color(id),
      seconds,
      money: hasRate ? money(seconds) : undefined,
    }))
    .sort((a, b) => b.seconds - a.seconds)
    .slice(0, 8);

  return (
    <div className="mx-auto h-full w-full max-w-xl space-y-4 overflow-y-auto p-3.5">
      {active && (
        <div className="flex items-center gap-3 rounded-xl border border-accent-200 bg-accent-50 p-3 dark:border-accent-900/50 dark:bg-accent-950/40">
          <span className="h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-accent-500" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-gray-800 dark:text-gray-100">
              {active.description || t("entries.noDescription")}
            </p>
            <p className="truncate text-xs text-gray-500 dark:text-gray-400">
              {lookup.project(active.project)} ·{" "}
              {lookup.activity(active.activity)}
            </p>
          </div>
          <Elapsed
            begin={active.begin}
            className="font-mono text-lg font-semibold tabular-nums text-accent-700 dark:text-accent-300"
          />
          <button
            type="button"
            title={t("tracker.stop")}
            onClick={() => stop.mutate(active.id)}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500 text-white transition hover:bg-red-600 active:scale-95"
          >
            <span className="h-3 w-3 rounded-xs bg-white" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        <StatTile
          label={t("dashboard.today")}
          value={formatDurationShort(totals.today)}
          sub={hasRate ? money(totals.today) : undefined}
          sub2={hasConversion ? moneyConverted(totals.today) : undefined}
        />
        <StatTile
          label={t("dashboard.thisWeek")}
          value={formatDurationShort(totals.week)}
          sub={hasRate ? money(totals.week) : undefined}
          sub2={hasConversion ? moneyConverted(totals.week) : undefined}
        />
        <StatTile
          label={t("dashboard.thisMonth")}
          value={formatDurationShort(totals.month)}
          sub={hasRate ? money(totals.month) : undefined}
          sub2={hasConversion ? moneyConverted(totals.month) : undefined}
        />
      </div>

      <Card title={t("dashboard.last7Days")}>
        <DayBars
          days={days}
          labelFn={weekdayShort}
          money={hasRate ? money : undefined}
        />
      </Card>

      <Card title={t("dashboard.thisWeekByProject")}>
        <BarList items={projectItems} />
      </Card>
    </div>
  );
}
