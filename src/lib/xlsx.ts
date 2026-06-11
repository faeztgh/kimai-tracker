import ExcelJS from "exceljs";
import { formatDurationShort } from "./format";

export interface XlsxReportData {
  orgAlias: string;
  periodLabel: string;
  generatedAt?: string;
  accentHex: string;
  logoDataUrl?: string;
  stats: { label: string; value: string; accent?: boolean }[];
  income?: {
    amount: string;
    rate: string;
    tracked?: string;
    billable?: string;
  };
  incomeConverted?: { amount: string; currency: string };
  byDay?: { label: string; seconds: number }[];
  byProject: {
    label: string;
    color: string;
    seconds: number;
    pct: number;
    money?: string;
  }[];
  byActivity: {
    label: string;
    color: string;
    seconds: number;
    pct: number;
    money?: string;
  }[];
  byTag: {
    label: string;
    color: string;
    seconds: number;
    pct: number;
    money?: string;
  }[];
  entries: {
    date: string;
    start: string;
    end: string;
    durationFmt: string;
    hours: number;
    project: string;
    activity: string;
    description: string;
    tags: string;
    billable: boolean;
    income?: string;
    incomeConverted?: string;
  }[];
}

type Bar = XlsxReportData["byProject"][number];

const FONT =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

// ── Color helpers ────────────────────────────────────────────────────
function hexToArgb(hex: string): string {
  let h = hex.replace("#", "").trim();
  if (/^[0-9a-f]{3}$/i.test(h))
    h = h
      .split("")
      .map((c) => c + c)
      .join(""); // #abc → aabbcc
  return `FF${(/^[0-9a-f]{6}$/i.test(h) ? h : "3B82F6").toUpperCase()}`;
}

/** Lighten (amount > 0) or darken (amount < 0) a #rrggbb color. */
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

/** Mix a color toward white. t=0 → unchanged, t=1 → white. */
function mixWhite(hex: string, t: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const num = parseInt(m[1], 16);
  const mc = (c: number) => Math.round(c + (255 - c) * t);
  const r = mc((num >> 16) & 0xff);
  const g = mc((num >> 8) & 0xff);
  const b = mc(num & 0xff);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

// ── Canvas chart rendering ───────────────────────────────────────────
// ExcelJS has no native chart API, so charts are drawn to an offscreen
// canvas (renderer has the DOM) at 2× for crisp output and embedded as PNGs.
interface ChartImage {
  base64: string;
  width: number;
  height: number;
}

function makeCanvas(
  w: number,
  h: number,
): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const scale = 2;
  const canvas = document.createElement("canvas");
  canvas.width = w * scale;
  canvas.height = h * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas context unavailable");
  ctx.scale(scale, scale);
  return { canvas, ctx };
}

function rrect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number,
): void {
  const r = Math.max(0, Math.min(radius, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function fitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxW: number,
): string {
  if (ctx.measureText(text).width <= maxW) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > maxW)
    t = t.slice(0, -1);
  return `${t}…`;
}

function toImage(
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
): ChartImage {
  return { base64: canvas.toDataURL("image/png").split(",")[1], width, height };
}

function renderColumnChart(
  title: string,
  days: { label: string; seconds: number }[],
  accentHex: string,
): ChartImage | null {
  if (!days.length) return null;
  const W = 620,
    H = 240;
  const { canvas, ctx } = makeCanvas(W, H);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#374151";
  ctx.font = `600 13px ${FONT}`;
  ctx.fillText(title, 18, 26);

  const padL = 20,
    padR = 16,
    padT = 46,
    padB = 34;
  const plotW = W - padL - padR,
    plotH = H - padT - padB;
  const max = Math.max(1, ...days.map((d) => d.seconds));

  ctx.strokeStyle = "#eef0f3";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = padT + plotH - (plotH * i) / 4;
    ctx.beginPath();
    ctx.moveTo(padL, y + 0.5);
    ctx.lineTo(W - padR, y + 0.5);
    ctx.stroke();
  }

  const slot = plotW / days.length;
  const bw = Math.min(46, slot * 0.6);
  days.forEach((d, i) => {
    const cx = padL + slot * i + slot / 2;
    const h = d.seconds > 0 ? Math.max(3, (d.seconds / max) * plotH) : 0;
    const x = cx - bw / 2;
    const y = padT + plotH - h;
    if (h > 0) {
      const g = ctx.createLinearGradient(0, y, 0, y + h);
      g.addColorStop(0, shade(accentHex, 0.22));
      g.addColorStop(1, accentHex);
      ctx.fillStyle = g;
      rrect(ctx, x, y, bw, h, 4);
      ctx.fill();
      ctx.fillStyle = "#6b7280";
      ctx.font = `600 9px ${FONT}`;
      ctx.textAlign = "center";
      ctx.fillText(formatDurationShort(d.seconds), cx, y - 5);
      ctx.textAlign = "start";
    }
    ctx.fillStyle = "#9ca3af";
    ctx.font = `10px ${FONT}`;
    ctx.textAlign = "center";
    ctx.fillText(fitText(ctx, d.label, slot), cx, H - 12);
    ctx.textAlign = "start";
  });

  return toImage(canvas, W, H);
}

function renderDonutChart(
  title: string,
  items: Bar[],
  _accentHex: string,
): ChartImage | null {
  if (!items.length) return null;
  const total = items.reduce((s, it) => s + it.seconds, 0);
  if (total <= 0) return null;

  const W = 620;
  const rowH = 22;
  const legendCount = Math.min(items.length, 8) + (items.length > 8 ? 1 : 0);
  const H = Math.max(212, 52 + legendCount * rowH);
  const { canvas, ctx } = makeCanvas(W, H);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#374151";
  ctx.font = `600 13px ${FONT}`;
  ctx.fillText(title, 18, 26);

  const cx = 120,
    cy = H / 2 + 10,
    rO = 78,
    rI = 46;
  let a0 = -Math.PI / 2;
  for (const it of items) {
    const a1 = a0 + (it.seconds / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, rO, a0, a1);
    ctx.closePath();
    ctx.fillStyle = it.color;
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    a0 = a1;
  }
  ctx.beginPath();
  ctx.arc(cx, cy, rI, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.fillStyle = "#374151";
  ctx.font = `700 15px ${FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(formatDurationShort(total), cx, cy - 6);
  ctx.fillStyle = "#9ca3af";
  ctx.font = `9px ${FONT}`;
  ctx.fillText("total", cx, cy + 12);
  ctx.textAlign = "start";
  ctx.textBaseline = "alphabetic";

  const lx = 230;
  let ly = 52;
  for (const it of items.slice(0, 8)) {
    const pct = Math.round((it.seconds / total) * 100);
    ctx.fillStyle = it.color;
    rrect(ctx, lx, ly - 9, 11, 11, 3);
    ctx.fill();
    ctx.fillStyle = "#374151";
    ctx.font = `11px ${FONT}`;
    ctx.fillText(fitText(ctx, it.label, W - lx - 120), lx + 18, ly);
    ctx.fillStyle = "#6b7280";
    ctx.font = `600 11px ${FONT}`;
    ctx.textAlign = "right";
    ctx.fillText(`${formatDurationShort(it.seconds)}   ${pct}%`, W - 16, ly);
    ctx.textAlign = "start";
    ly += rowH;
  }
  if (items.length > 8) {
    const rest = items.slice(8).reduce((s, it) => s + it.seconds, 0);
    const pct = Math.round((rest / total) * 100);
    ctx.fillStyle = "#cbd5e1";
    rrect(ctx, lx, ly - 9, 11, 11, 3);
    ctx.fill();
    ctx.fillStyle = "#6b7280";
    ctx.font = `11px ${FONT}`;
    ctx.fillText(`+${items.length - 8} more`, lx + 18, ly);
    ctx.textAlign = "right";
    ctx.font = `600 11px ${FONT}`;
    ctx.fillText(`${formatDurationShort(rest)}   ${pct}%`, W - 16, ly);
    ctx.textAlign = "start";
  }

  return toImage(canvas, W, H);
}

function renderBarChartH(
  title: string,
  items: Bar[],
  _accentHex: string,
): ChartImage | null {
  if (!items.length) return null;
  const rows = items.slice(0, 10);
  const max = Math.max(1, ...rows.map((r) => r.seconds));
  const W = 620,
    top = 46,
    rowH = 30,
    padB = 14;
  const H = top + rows.length * rowH + padB;
  const { canvas, ctx } = makeCanvas(W, H);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#374151";
  ctx.font = `600 13px ${FONT}`;
  ctx.fillText(title, 18, 26);

  const labelW = 150;
  const barX = 18 + labelW + 12;
  const valW = 96;
  const barMaxW = W - barX - valW - 14;
  rows.forEach((it, i) => {
    const cy = top + i * rowH + rowH / 2;
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#374151";
    ctx.font = `11px ${FONT}`;
    ctx.fillText(fitText(ctx, it.label, labelW), 18, cy);
    ctx.fillStyle = "#eef0f3";
    rrect(ctx, barX, cy - 7, barMaxW, 14, 7);
    ctx.fill();
    const w = Math.max(6, (it.seconds / max) * barMaxW);
    const g = ctx.createLinearGradient(barX, 0, barX + w, 0);
    g.addColorStop(0, it.color);
    g.addColorStop(1, shade(it.color, 0.18));
    ctx.fillStyle = g;
    rrect(ctx, barX, cy - 7, w, 14, 7);
    ctx.fill();
    ctx.fillStyle = "#374151";
    ctx.font = `600 11px ${FONT}`;
    ctx.textAlign = "right";
    ctx.fillText(formatDurationShort(it.seconds), W - 14, cy);
    ctx.textAlign = "start";
    ctx.textBaseline = "alphabetic";
  });

  return toImage(canvas, W, H);
}

// ── Workbook ─────────────────────────────────────────────────────────
export async function buildReportWorkbook(
  data: XlsxReportData,
): Promise<ExcelJS.Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Kimai Tracker";
  wb.created = new Date();

  const accentArgb = hexToArgb(data.accentHex);
  const accentDark = shade(data.accentHex, -0.28);
  const accentDarkArgb = hexToArgb(accentDark);
  const accentTintArgb = hexToArgb(mixWhite(data.accentHex, 0.9));
  const accentBorderArgb = hexToArgb(mixWhite(data.accentHex, 0.5));
  const GRAY = "FF6B7280";
  const LIGHT = "FF9CA3AF";
  const INK = "FF1F2937";
  const HAIRLINE = "FFE5E7EB";

  // ═══ Summary sheet ════════════════════════════════════════════════
  const summary = wb.addWorksheet("Summary", {
    views: [{ showGridLines: false }],
  });
  summary.getColumn(1).width = 5;
  summary.getColumn(2).width = 26;
  summary.getColumn(3).width = 18;
  summary.getColumn(4).width = 8;
  summary.getColumn(5).width = 13;
  summary.getColumn(6).width = 15;

  // Cover band — gradient accent with logo + title + period.
  summary.mergeCells("A1:F1");
  summary.mergeCells("A2:F2");
  const gradient: ExcelJS.Fill = {
    type: "gradient",
    gradient: "angle",
    degree: 135,
    stops: [
      { position: 0, color: { argb: accentArgb } },
      { position: 1, color: { argb: accentDarkArgb } },
    ],
  };
  const titleIndent = data.logoDataUrl ? 5 : 1;
  const title = summary.getCell("A1");
  title.value = data.orgAlias;
  title.fill = gradient;
  title.font = { bold: true, size: 18, color: { argb: "FFFFFFFF" } };
  title.alignment = {
    vertical: "middle",
    horizontal: "left",
    indent: titleIndent,
  };
  const sub = summary.getCell("A2");
  sub.value = `KIMAI TIME REPORT   ·   ${data.periodLabel}${data.generatedAt ? `   ·   Generated ${data.generatedAt}` : ""}`;
  sub.fill = gradient;
  sub.font = { bold: true, size: 9, color: { argb: "FFFFFFFF" } };
  sub.alignment = {
    vertical: "middle",
    horizontal: "left",
    indent: titleIndent,
  };
  summary.getRow(1).height = 30;
  summary.getRow(2).height = 18;

  if (data.logoDataUrl) {
    const raw = data.logoDataUrl.includes(",")
      ? data.logoDataUrl.split(",")[1]
      : data.logoDataUrl;
    const ext = data.logoDataUrl.startsWith("data:image/jpeg") ? "jpeg" : "png";
    const logoId = wb.addImage({ base64: raw, extension: ext });
    summary.addImage(logoId, {
      tl: { col: 0.25, row: 0.35 },
      ext: { width: 38, height: 38 },
    });
  }

  // Stat cards — 3 per band row, each spanning two columns.
  const cardCols = [1, 3, 5];
  const cardTop = 4;
  data.stats.forEach((s, i) => {
    const band = Math.floor(i / 3);
    const col = cardCols[i % 3];
    const r0 = cardTop + band * 2;
    summary.mergeCells(r0, col, r0, col + 1);
    summary.mergeCells(r0 + 1, col, r0 + 1, col + 1);
    const lc = summary.getCell(r0, col);
    const vc = summary.getCell(r0 + 1, col);
    lc.value = s.label.toUpperCase();
    lc.font = {
      size: 8,
      bold: true,
      color: { argb: s.accent ? accentDarkArgb : LIGHT },
    };
    lc.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
    vc.value = s.value;
    vc.font = {
      size: 15,
      bold: true,
      color: { argb: s.accent ? accentDarkArgb : INK },
    };
    vc.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
    const fill: ExcelJS.Fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: s.accent ? accentTintArgb : "FFFFFFFF" },
    };
    const bd = s.accent ? accentBorderArgb : HAIRLINE;
    const border: Partial<ExcelJS.Borders> = {
      top: { style: "thin", color: { argb: bd } },
      left: { style: "thin", color: { argb: bd } },
      right: { style: "thin", color: { argb: bd } },
      bottom: { style: "thin", color: { argb: bd } },
    };
    lc.fill = vc.fill = fill;
    lc.border = vc.border = border;
    summary.getRow(r0).height = 15;
    summary.getRow(r0 + 1).height = 22;
  });

  let row = cardTop + Math.ceil(data.stats.length / 3) * 2 + 1;

  // Income banner — accent-tinted, big amount + meta.
  if (data.income) {
    summary.mergeCells(row, 1, row + 1, 3);
    summary.mergeCells(row, 4, row + 1, 6);
    const amt = summary.getCell(row, 1);
    amt.value = {
      richText: [
        {
          text: "ESTIMATED INCOME\n",
          font: { size: 8, bold: true, color: { argb: accentDarkArgb } },
        },
        {
          text: data.income.amount,
          font: { bold: true, size: 22, color: { argb: accentDarkArgb } },
        },
      ],
    };
    amt.alignment = {
      vertical: "middle",
      horizontal: "left",
      indent: 1,
      wrapText: true,
    };
    const metaLines: string[] = [];
    if (data.income.tracked) metaLines.push(`${data.income.tracked} tracked`);
    metaLines.push(data.income.rate);
    if (data.income.billable)
      metaLines.push(`Billable: ${data.income.billable}`);
    if (data.incomeConverted)
      metaLines.push(
        `≈ ${data.incomeConverted.amount} ${data.incomeConverted.currency}`,
      );
    const meta = summary.getCell(row, 4);
    meta.value = metaLines.join("\n");
    meta.font = { size: 9, color: { argb: GRAY } };
    meta.alignment = {
      vertical: "middle",
      horizontal: "right",
      indent: 1,
      wrapText: true,
    };
    const bannerFill: ExcelJS.Fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: accentTintArgb },
    };
    const bannerBorder: Partial<ExcelJS.Borders> = {
      top: { style: "thin", color: { argb: accentBorderArgb } },
      left: { style: "thin", color: { argb: accentBorderArgb } },
      right: { style: "thin", color: { argb: accentBorderArgb } },
      bottom: { style: "thin", color: { argb: accentBorderArgb } },
    };
    amt.fill = meta.fill = bannerFill;
    amt.border = meta.border = bannerBorder;
    summary.getRow(row).height = 26;
    summary.getRow(row + 1).height = 26;
    row += 3;
  }

  // Breakdown tables — colored tag, in-cell mini bar, %, duration, income.
  const drawBreakdown = (
    startRow: number,
    heading: string,
    items: Bar[],
    withMoney: boolean,
  ): number => {
    if (!items.length) return startRow;
    summary.mergeCells(startRow, 1, startRow, 6);
    const h = summary.getCell(startRow, 1);
    h.value = heading.toUpperCase();
    h.font = { size: 9, bold: true, color: { argb: GRAY } };
    h.alignment = { vertical: "middle", indent: 1 };
    summary.getRow(startRow).height = 20;

    let r = startRow + 1;
    const headers = [
      "",
      "Name",
      "Share",
      "%",
      "Duration",
      ...(withMoney ? ["Income"] : []),
    ];
    headers.forEach((label, c) => {
      const cell = summary.getCell(r, c + 1);
      cell.value = label;
      cell.font = { size: 8, bold: true, color: { argb: LIGHT } };
      cell.border = { bottom: { style: "thin", color: { argb: HAIRLINE } } };
      cell.alignment = {
        vertical: "middle",
        horizontal: c >= 3 ? "right" : "left",
        indent: c <= 1 ? 1 : 0,
      };
    });
    r++;

    items.forEach((it, i) => {
      const argb = hexToArgb(it.color);
      summary.getCell(r, 1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb },
      };
      const name = summary.getCell(r, 2);
      name.value = it.label;
      name.font = { size: 10, color: { argb: INK } };
      name.alignment = { vertical: "middle", indent: 1 };
      const bars = Math.max(0, Math.min(14, Math.round((it.pct / 100) * 14)));
      const bar = summary.getCell(r, 3);
      bar.value = "█".repeat(bars);
      bar.font = { size: 10, color: { argb } };
      bar.alignment = { vertical: "middle" };
      const pct = summary.getCell(r, 4);
      pct.value = it.pct / 100;
      pct.numFmt = "0%";
      pct.font = { size: 10, color: { argb: LIGHT } };
      pct.alignment = { vertical: "middle", horizontal: "right" };
      const dur = summary.getCell(r, 5);
      dur.value = formatDurationShort(it.seconds);
      dur.font = { size: 10, color: { argb: "FF374151" } };
      dur.alignment = { vertical: "middle", horizontal: "right" };
      if (withMoney) {
        const m = summary.getCell(r, 6);
        m.value = it.money ?? "";
        m.font = { size: 10, bold: true, color: { argb: accentDarkArgb } };
        m.alignment = { vertical: "middle", horizontal: "right" };
      }
      if (i % 2 === 1) {
        for (let c = 2; c <= 6; c++) {
          summary.getCell(r, c).fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFF9FAFB" },
          };
        }
      }
      summary.getRow(r).height = 16;
      r++;
    });
    return r + 1;
  };

  const withMoney = Boolean(data.income);
  row = drawBreakdown(row, "By project", data.byProject, withMoney);
  row = drawBreakdown(row, "By activity", data.byActivity, withMoney);
  row = drawBreakdown(row, "By tag", data.byTag, withMoney);

  // ═══ Charts sheet ═════════════════════════════════════════════════
  const charts = wb.addWorksheet("Charts", {
    views: [{ showGridLines: false }],
  });
  charts.getColumn(1).width = 2;
  let chartRow = 1;
  const place = (img: ChartImage | null): void => {
    if (!img) return;
    const id = wb.addImage({ base64: img.base64, extension: "png" });
    charts.addImage(id, {
      tl: { col: 0.3, row: chartRow },
      ext: { width: img.width, height: img.height },
    });
    chartRow += Math.ceil(img.height / 18) + 2;
  };
  place(renderColumnChart("Hours per day", data.byDay ?? [], data.accentHex));
  place(renderDonutChart("Time by project", data.byProject, data.accentHex));
  place(renderBarChartH("By activity", data.byActivity, data.accentHex));
  place(renderBarChartH("By tag", data.byTag, data.accentHex));

  // ═══ Entries sheet ════════════════════════════════════════════════
  const sheet = wb.addWorksheet("Entries");
  const hasIncome = data.entries.some((e) => e.income !== undefined);
  const hasConverted = data.entries.some(
    (e) => e.incomeConverted !== undefined,
  );

  const headers = [
    "Date",
    "Start",
    "End",
    "Duration",
    "Hours",
    "Project",
    "Activity",
    "Description",
    "Tags",
    "Billable",
    ...(hasIncome ? ["Income"] : []),
    ...(hasConverted ? ["Converted"] : []),
  ];

  const headerRow = sheet.addRow(headers);
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: accentArgb },
    };
    cell.alignment = { vertical: "middle", horizontal: "center" };
  });
  headerRow.height = 22;
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  sheet.autoFilter = {
    from: "A1",
    to: `${String.fromCharCode(64 + headers.length)}1`,
  };

  let entryRow = 2;
  for (const e of data.entries) {
    const r = sheet.addRow([
      e.date,
      e.start,
      e.end,
      e.durationFmt,
      e.hours,
      e.project,
      e.activity,
      e.description,
      e.tags,
      e.billable ? "Yes" : "No",
      ...(hasIncome ? [e.income ?? ""] : []),
      ...(hasConverted ? [e.incomeConverted ?? ""] : []),
    ]);
    if (entryRow % 2 === 0) {
      r.eachCell((cell) => {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF9FAFB" },
        };
      });
    }
    r.getCell(5).numFmt = "0.00";
    entryRow++;
  }

  const totalHours = data.entries.reduce((s, e) => s + e.hours, 0);
  const totalsRow = sheet.addRow([
    "TOTAL",
    "",
    "",
    "",
    totalHours,
    ...Array(headers.length - 5).fill(""),
  ]);
  totalsRow.font = { bold: true };
  totalsRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: HAIRLINE },
  };
  totalsRow.getCell(5).numFmt = "0.00";

  const colWidths = [11, 7, 7, 9, 7, 20, 18, 35, 20, 9, 12, 12];
  colWidths.forEach((w, i) => {
    const col = sheet.getColumn(i + 1);
    if (col) col.width = w;
  });

  return wb.xlsx.writeBuffer();
}
