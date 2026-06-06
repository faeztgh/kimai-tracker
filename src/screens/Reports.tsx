import { useState } from "react";
import { BarList, DayBars, type BarItem } from "../components/Bars";
import { DateTimePicker } from "../components/DateTimePicker";
import { AnimatedNumber } from "../components/AnimatedNumber";
import { Card } from "../components/Card";
import { StatTile } from "../components/StatTile";
import { useReport } from "../hooks/useReport";
import { colorForId, useEntityLookup } from "../hooks/useEntities";
import { useIncome } from "../hooks/useIncome";
import { activeAlias, useSettings } from "../store/settings";
import { toCsv, downloadTextFile } from "../lib/csv";
import { ACCENTS } from "../lib/theme";
import {
  buildReportHtml,
  loadLogoDataUrl,
  type PdfBar,
  type PdfEntry,
} from "../lib/pdf";
import {
  durationOf,
  formatClock,
  formatDateShort,
  formatDurationShort,
  formatMoney,
  incomeOf,
  monthDayShort,
  startOfMonth,
  startOfWeek,
  toDatetimeLocalInput,
  weekdayShort,
} from "../lib/format";

type Preset = "week" | "month" | "last7" | "last30" | "custom";

const PRESETS: { id: Preset; label: string }[] = [
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
  { id: "last7", label: "7d" },
  { id: "last30", label: "30d" },
  { id: "custom", label: "Custom" },
];

function fixedRange(
  p: Exclude<Preset, "custom">,
  weekStart: number,
): { begin: Date; end: Date } {
  const end = new Date();
  end.setHours(23, 59, 59, 0);
  if (p === "week") return { begin: startOfWeek(weekStart), end };
  if (p === "month") return { begin: startOfMonth(), end };
  const begin = new Date();
  begin.setHours(0, 0, 0, 0);
  begin.setDate(begin.getDate() - (p === "last7" ? 6 : 29));
  return { begin, end };
}

function tagColor(tag: string): string {
  let h = 0;
  for (let i = 0; i < tag.length; i++) h = (h * 31 + tag.charCodeAt(i)) | 0;
  return colorForId(Math.abs(h));
}

export function Reports() {
  const weekStartDay = useSettings((s) => s.weekStart);
  const accent = useSettings((s) => s.accent);
  const alias = useSettings(activeAlias);
  const [preset, setPreset] = useState<Preset>("week");
  const [pdfBusy, setPdfBusy] = useState(false);
  const [customBegin, setCustomBegin] = useState(() => toDatetimeLocalInput(startOfWeek(weekStartDay)));
  const [customEnd, setCustomEnd] = useState(() => toDatetimeLocalInput(new Date()));

  const lookup = useEntityLookup();
  const { hasRate, money, hourlyRate, currency } = useIncome();

  let begin: Date;
  let end: Date;
  if (preset === "custom") {
    const b = new Date(customBegin);
    const e = new Date(customEnd);
    const valid = !Number.isNaN(b.getTime()) && !Number.isNaN(e.getTime()) && e > b;
    ({ begin, end } = valid ? { begin: b, end: e } : fixedRange("week", weekStartDay));
  } else {
    ({ begin, end } = fixedRange(preset, weekStartDay));
  }

  const span = end.getTime() - begin.getTime();
  const prevEnd = new Date(begin.getTime() - 1);
  const prevBegin = new Date(begin.getTime() - 1 - span);

  const report = useReport(begin, end);
  const prev = useReport(prevBegin, prevEnd);

  const labelFn = span > 9 * 86_400_000 ? monthDayShort : weekdayShort;
  const avg = report.activeDays > 0 ? report.total / report.activeDays : 0;
  const delta =
    prev.total > 0 ? ((report.total - prev.total) / prev.total) * 100 : null;

  const projectItems: BarItem[] = report.byProject.map((p) => ({
    label: lookup.project(p.projectId),
    color: lookup.color(p.projectId),
    seconds: p.seconds,
    money: hasRate ? money(p.seconds) : undefined,
  }));
  const activityItems: BarItem[] = report.byActivity.map((a) => ({
    label: lookup.activity(a.activityId),
    color: colorForId(a.activityId),
    seconds: a.seconds,
    money: hasRate ? money(a.seconds) : undefined,
  }));
  const tagItems: BarItem[] = report.byTag.map((t) => ({
    label: `#${t.tag}`,
    color: tagColor(t.tag),
    seconds: t.seconds,
    money: hasRate ? money(t.seconds) : undefined,
  }));

  function exportCsv() {
    const headers = [
      "Date", "Start", "End", "Duration", "Hours", "Project", "Activity",
      "Description", "Tags", "Billable", ...(hasRate ? ["Income"] : []),
    ];
    const rows = report.entries.map((t) => {
      const secs = durationOf(t);
      return [
        formatDateShort(new Date(t.begin)),
        formatClock(t.begin),
        t.end ? formatClock(t.end) : "",
        formatDurationShort(secs),
        (secs / 3600).toFixed(2),
        lookup.project(t.project),
        lookup.activity(t.activity),
        t.description ?? "",
        (t.tags ?? []).join(" "),
        t.billable ? "yes" : "no",
        ...(hasRate ? [incomeOf(secs, hourlyRate).toFixed(2)] : []),
      ];
    });
    const stamp = `${toDatetimeLocalInput(begin).slice(0, 10)}_${toDatetimeLocalInput(end).slice(0, 10)}`;
    downloadTextFile(`kimai-timesheet_${stamp}.csv`, toCsv(headers, rows));
  }

  const stamp = `${toDatetimeLocalInput(begin).slice(0, 10)}_${toDatetimeLocalInput(end).slice(0, 10)}`;

  function toPdfBars(items: BarItem[]): PdfBar[] {
    return items.map((it) => ({
      label: it.label,
      color: it.color,
      seconds: it.seconds,
      pct: report.total > 0 ? Math.round((it.seconds / report.total) * 100) : 0,
      money: it.money,
    }));
  }

  async function exportPdf() {
    setPdfBusy(true);
    try {
      const maxDay = Math.max(1, ...report.byDay.map((d) => d.seconds));
      const accentHex = ACCENTS.find((a) => a.id === accent)?.hex ?? "#3b82f6";
      const logoDataUrl = await loadLogoDataUrl();

      const stats = [
        { label: "Total", value: formatDurationShort(report.total), accent: true },
        { label: "Billable", value: formatDurationShort(report.billableTotal) },
        { label: "Entries", value: String(report.count) },
        { label: "Avg / day", value: formatDurationShort(avg) },
        { label: "Projects", value: String(report.byProject.length) },
        { label: "Active days", value: String(report.activeDays) },
      ];

      const entries: PdfEntry[] = report.entries.map((t) => {
        const secs = durationOf(t);
        return {
          date: formatDateShort(new Date(t.begin)),
          time: `${formatClock(t.begin)}–${t.end ? formatClock(t.end) : ""}`,
          project: lookup.project(t.project),
          activity: lookup.activity(t.activity),
          description: t.description ?? "",
          tags: (t.tags ?? []).map((x) => `#${x}`).join(" "),
          duration: formatDurationShort(secs),
          billable: !!t.billable,
          income: hasRate ? money(secs) : undefined,
        };
      });

      const html = buildReportHtml({
        orgAlias: alias,
        periodLabel: `${formatDateShort(begin)} – ${formatDateShort(end)}`,
        generatedAt: new Date().toLocaleString(),
        accentHex,
        logoDataUrl,
        stats,
        income: hasRate
          ? {
              amount: money(report.total),
              tracked: formatDurationShort(report.total),
              rate: `@ ${formatMoney(hourlyRate, currency)}/h`,
              billable:
                report.billableTotal > 0 && report.billableTotal !== report.total
                  ? money(report.billableTotal)
                  : undefined,
            }
          : undefined,
        byDay: report.byDay.map((d) => ({
          label: labelFn(d.key),
          seconds: d.seconds,
          pct: Math.round((d.seconds / maxDay) * 100),
        })),
        byProject: toPdfBars(projectItems),
        byActivity: toPdfBars(activityItems),
        byTag: toPdfBars(tagItems),
        entries,
      });

      const result = await window.api.pdf.export(html, `kimai-report_${stamp}.pdf`);
      if (!result.ok && !result.canceled && result.error) {
        window.api.notify("PDF export failed", result.error);
      }
    } finally {
      setPdfBusy(false);
    }
  }

  return (
    <div className="mx-auto h-full w-full max-w-xl space-y-4 overflow-y-auto p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex overflow-hidden rounded-lg border border-gray-300 text-xs dark:border-gray-600">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPreset(p.id)}
              className={`px-2.5 py-1.5 transition ${
                preset === p.id
                  ? "bg-accent-500 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {formatDateShort(begin)} – {formatDateShort(end)}
          </span>
          <button
            type="button"
            onClick={exportCsv}
            disabled={report.count === 0}
            title="Export this range to CSV"
            className="flex items-center gap-1 rounded-lg border border-gray-300 px-2 py-1 text-xs font-medium text-gray-600
              transition hover:bg-gray-50 disabled:opacity-40 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
            CSV
          </button>
          <button
            type="button"
            onClick={() => void exportPdf()}
            disabled={report.count === 0 || pdfBusy}
            title="Export this range to a styled PDF"
            className="flex items-center gap-1 rounded-lg border border-accent-300 bg-accent-50 px-2 py-1 text-xs font-medium text-accent-700
              transition hover:bg-accent-100 disabled:opacity-40 dark:border-accent-900/50 dark:bg-accent-950/40 dark:text-accent-300 dark:hover:bg-accent-950/70"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <path d="M14 2v6h6M9 15h6M9 18h6M9 12h2" />
            </svg>
            {pdfBusy ? "Exporting…" : "PDF"}
          </button>
        </div>
      </div>

      {preset === "custom" && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <div className="w-[180px]">
            <DateTimePicker value={customBegin} onChange={setCustomBegin} placeholder="From" />
          </div>
          <span>→</span>
          <div className="w-[180px]">
            <DateTimePicker value={customEnd} onChange={setCustomEnd} placeholder="To" />
          </div>
        </div>
      )}

      {hasRate && (
        <div className="flex items-center justify-between rounded-xl border border-accent-200 bg-accent-50 px-4 py-3 dark:border-accent-900/50 dark:bg-accent-950/40">
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-wide text-accent-700/70 dark:text-accent-400/80">
              Estimated income
            </p>
            <AnimatedNumber
              value={money(report.total)}
              className="block font-mono text-2xl font-bold tabular-nums text-accent-700 dark:text-accent-300"
            />
          </div>
          <div className="shrink-0 text-right text-[11px] leading-relaxed text-gray-500 dark:text-gray-400">
            <div>{formatDurationShort(report.total)} tracked</div>
            <div>@ {formatMoney(hourlyRate, currency)}/h</div>
            {report.billableTotal > 0 && report.billableTotal !== report.total && (
              <div>billable: {money(report.billableTotal)}</div>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        <StatTile label="Total" value={formatDurationShort(report.total)} primary delta={delta} />
        <StatTile label="Billable" value={formatDurationShort(report.billableTotal)} />
        <StatTile label="Entries" value={String(report.count)} />
        <StatTile label="Avg / day" value={formatDurationShort(avg)} />
        <StatTile label="Projects" value={String(report.byProject.length)} />
        <StatTile label="Active days" value={String(report.activeDays)} />
      </div>

      {report.isLoading ? (
        <p className="text-sm text-gray-400 dark:text-gray-500">Loading report…</p>
      ) : report.error instanceof Error ? (
        <p className="text-sm text-red-500">{report.error.message}</p>
      ) : report.count === 0 ? (
        <p className="rounded-xl border border-gray-200 bg-white p-6 text-center text-sm text-gray-400 shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-500">
          No time tracked in this range.
        </p>
      ) : (
        <>
          <Card title="Per day">
            <DayBars days={report.byDay} labelFn={labelFn} money={hasRate ? money : undefined} />
          </Card>
          <Card title="By project">
            <BarList items={projectItems} total={report.total} />
          </Card>
          <Card title="By activity">
            <BarList items={activityItems} total={report.total} />
          </Card>
          {tagItems.length > 0 && (
            <Card title="By tag">
              <BarList items={tagItems} total={report.total} />
            </Card>
          )}
        </>
      )}
    </div>
  );
}

