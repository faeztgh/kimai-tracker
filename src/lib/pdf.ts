import logoUrl from "../assets/kimai-logo.png";
import { formatDurationShort } from "./format";

export interface PdfBar {
  label: string;
  color: string;
  seconds: number;
  pct: number;
  money?: string;
}

export interface PdfEntry {
  date: string;
  time: string;
  project: string;
  activity: string;
  description: string;
  tags: string;
  duration: string;
  billable: boolean;
  income?: string;
}

export interface PdfStat {
  label: string;
  value: string;
  accent?: boolean;
}

export interface ReportPdfData {
  orgAlias: string;
  periodLabel: string;
  generatedAt: string;
  accentHex: string;
  logoDataUrl: string;
  stats: PdfStat[];
  income?: { amount: string; tracked: string; rate: string; billable?: string };
  byDay: { label: string; seconds: number; pct: number }[];
  byProject: PdfBar[];
  byActivity: PdfBar[];
  byTag: PdfBar[];
  entries: PdfEntry[];
}

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function shade(hex: string, amount: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const num = parseInt(m[1], 16);
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  const r = clamp(((num >> 16) & 0xff) * (1 + amount));
  const g = clamp(((num >> 8) & 0xff) * (1 + amount));
  const b = clamp((num & 0xff) * (1 + amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

function statCards(stats: PdfStat[]): string {
  return stats
    .map(
      (s) => `
      <div class="stat ${s.accent ? "stat-accent" : ""}">
        <div class="stat-label">${esc(s.label)}</div>
        <div class="stat-value">${esc(s.value)}</div>
      </div>`,
    )
    .join("");
}

function dayChart(days: ReportPdfData["byDay"]): string {
  if (days.length === 0) return "";
  const bars = days
    .map(
      (d) => `
      <div class="day">
        <div class="day-track">
          <div class="day-fill" style="height:${Math.max(2, d.pct)}%"></div>
        </div>
        <div class="day-val">${d.seconds > 0 ? esc(formatDurationShort(d.seconds)) : ""}</div>
        <div class="day-label">${esc(d.label)}</div>
      </div>`,
    )
    .join("");
  return `<section class="card avoid-break">
    <h2>Hours per day</h2>
    <div class="day-chart">${bars}</div>
  </section>`;
}

function barList(title: string, items: PdfBar[]): string {
  if (items.length === 0) return "";
  const rows = items
    .map(
      (it) => `
      <div class="bar-row">
        <span class="dot" style="background:${esc(it.color)}"></span>
        <span class="bar-label">${esc(it.label)}</span>
        <span class="bar-track"><span class="bar-fill" style="width:${Math.max(2, it.pct)}%;background:${esc(it.color)}"></span></span>
        <span class="bar-pct">${it.pct}%</span>
        <span class="bar-dur">${esc(formatDurationShort(it.seconds))}</span>
        ${it.money ? `<span class="bar-money">${esc(it.money)}</span>` : ""}
      </div>`,
    )
    .join("");
  return `<section class="card avoid-break">
    <h2>${esc(title)}</h2>
    <div class="bars">${rows}</div>
  </section>`;
}

function entryTable(entries: PdfEntry[], hasIncome: boolean): string {
  if (entries.length === 0) return "";
  const head = `
    <tr>
      <th>Date</th><th>Time</th><th>Project</th><th>Activity</th>
      <th>Description</th><th class="num">Duration</th>${hasIncome ? '<th class="num">Income</th>' : ""}
    </tr>`;
  const rows = entries
    .map(
      (e) => `
      <tr>
        <td class="nowrap">${esc(e.date)}</td>
        <td class="nowrap">${esc(e.time)}</td>
        <td>${esc(e.project)}</td>
        <td>${esc(e.activity)}</td>
        <td>${esc(e.description)}${e.tags ? `<span class="tags">${esc(e.tags)}</span>` : ""}</td>
        <td class="num">${esc(e.duration)}</td>
        ${hasIncome ? `<td class="num">${esc(e.income ?? "")}</td>` : ""}
      </tr>`,
    )
    .join("");
  return `<section class="card">
    <h2>Detailed entries</h2>
    <table>${head}${rows}</table>
  </section>`;
}

export function buildReportHtml(d: ReportPdfData): string {
  const accent = d.accentHex;
  const accentDark = shade(accent, -0.28);
  const hasIncome = d.entries.some((e) => e.income !== undefined);

  const incomeBanner = d.income
    ? `<section class="card income avoid-break">
        <div>
          <div class="income-label">Estimated income</div>
          <div class="income-amount">${esc(d.income.amount)}</div>
        </div>
        <div class="income-meta">
          <div>${esc(d.income.tracked)} tracked</div>
          <div>${esc(d.income.rate)}</div>
          ${d.income.billable ? `<div>billable: ${esc(d.income.billable)}</div>` : ""}
        </div>
      </section>`
    : "";

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<style>
  @page { size: A4; margin: 14mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: #1f2937; font-size: 11px; line-height: 1.5; -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .avoid-break { break-inside: avoid; }
  header.cover {
    display: flex; align-items: center; justify-content: space-between;
    background: linear-gradient(135deg, ${accent}, ${accentDark});
    color: #fff; border-radius: 16px; padding: 22px 24px; margin-bottom: 18px;
  }
  .brand { display: flex; align-items: center; gap: 14px; }
  .brand img { width: 44px; height: 44px; border-radius: 10px; background: rgba(255,255,255,.95); padding: 5px; }
  .brand .org { font-size: 22px; font-weight: 700; letter-spacing: -0.02em; }
  .brand .sub { font-size: 11px; opacity: .9; margin-top: 2px; text-transform: uppercase; letter-spacing: .08em; }
  .cover .meta { text-align: right; font-size: 10px; opacity: .9; }
  .cover .meta .period { font-size: 13px; font-weight: 600; opacity: 1; margin-bottom: 4px; }
  .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 16px; }
  .stat { border: 1px solid #e5e7eb; border-radius: 12px; padding: 12px 14px; background: #fff; }
  .stat-accent { border-color: ${accent}55; background: ${accent}0d; }
  .stat-label { font-size: 9px; text-transform: uppercase; letter-spacing: .07em; color: #9ca3af; font-weight: 600; }
  .stat-value { font-size: 18px; font-weight: 700; margin-top: 3px; font-variant-numeric: tabular-nums; }
  .card { border: 1px solid #e5e7eb; border-radius: 14px; padding: 16px 18px; margin-bottom: 14px; background: #fff; }
  .card h2 { font-size: 11px; text-transform: uppercase; letter-spacing: .07em; color: #6b7280; margin: 0 0 12px; }
  .income { display: flex; align-items: center; justify-content: space-between; border-color: ${accent}55; background: ${accent}0d; }
  .income-label { font-size: 9px; text-transform: uppercase; letter-spacing: .07em; color: ${accentDark}; font-weight: 600; }
  .income-amount { font-size: 26px; font-weight: 800; color: ${accentDark}; font-variant-numeric: tabular-nums; }
  .income-meta { text-align: right; font-size: 10px; color: #6b7280; line-height: 1.7; }
  .day-chart { display: flex; align-items: flex-end; gap: 6px; height: 150px; }
  .day { flex: 1; display: flex; flex-direction: column; align-items: center; height: 100%; }
  .day-track { flex: 1; width: 100%; display: flex; align-items: flex-end; }
  .day-fill { width: 100%; border-radius: 5px 5px 0 0; background: linear-gradient(to top, ${accent}, ${shade(accent, 0.18)}); }
  .day-val { font-size: 8px; color: #9ca3af; margin-top: 4px; font-variant-numeric: tabular-nums; }
  .day-label { font-size: 8px; color: #6b7280; margin-top: 2px; }
  .bars { display: flex; flex-direction: column; gap: 9px; }
  .bar-row { display: flex; align-items: center; gap: 8px; }
  .dot { width: 9px; height: 9px; border-radius: 50%; flex: none; }
  .bar-label { width: 130px; flex: none; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .bar-track { flex: 1; height: 7px; background: #eef0f3; border-radius: 5px; overflow: hidden; }
  .bar-fill { display: block; height: 100%; border-radius: 5px; }
  .bar-pct { width: 34px; text-align: right; color: #9ca3af; font-variant-numeric: tabular-nums; }
  .bar-dur { width: 56px; text-align: right; font-variant-numeric: tabular-nums; color: #374151; }
  .bar-money { width: 72px; text-align: right; font-weight: 600; color: ${accentDark}; font-variant-numeric: tabular-nums; }
  table { width: 100%; border-collapse: collapse; font-size: 10px; }
  th { text-align: left; color: #6b7280; font-weight: 600; text-transform: uppercase; font-size: 8px; letter-spacing: .05em; padding: 6px 8px; border-bottom: 2px solid #e5e7eb; }
  td { padding: 6px 8px; border-bottom: 1px solid #f1f3f5; vertical-align: top; }
  tr:nth-child(even) td { background: #fafbfc; }
  .num { text-align: right; font-variant-numeric: tabular-nums; }
  .nowrap { white-space: nowrap; }
  .tags { display: block; color: ${accentDark}; font-size: 9px; margin-top: 2px; }
  footer { margin-top: 18px; text-align: center; color: #9ca3af; font-size: 9px; }
</style>
</head>
<body>
  <header class="cover">
    <div class="brand">
      <img src="${d.logoDataUrl}" alt="" />
      <div>
        <div class="org">${esc(d.orgAlias)}</div>
        <div class="sub">Kimai Time Report</div>
      </div>
    </div>
    <div class="meta">
      <div class="period">${esc(d.periodLabel)}</div>
      <div>Generated ${esc(d.generatedAt)}</div>
    </div>
  </header>

  <div class="stats">${statCards(d.stats)}</div>
  ${incomeBanner}
  ${dayChart(d.byDay)}
  ${barList("By project", d.byProject)}
  ${barList("By activity", d.byActivity)}
  ${barList("By tag", d.byTag)}
  ${entryTable(d.entries, hasIncome)}

  <footer>Generated by Kimai Tracker · ${esc(d.orgAlias)} · ${esc(d.periodLabel)}</footer>
</body>
</html>`;
}

let cachedLogo: string | null = null;

export async function loadLogoDataUrl(): Promise<string> {
  if (cachedLogo) return cachedLogo;
  try {
    const res = await fetch(logoUrl);
    const blob = await res.blob();
    cachedLogo = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
    return cachedLogo;
  } catch {
    return "";
  }
}
