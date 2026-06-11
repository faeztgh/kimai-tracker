import { writeFile } from "node:fs/promises";
import { BrowserWindow, dialog, session } from "electron";
import { getMainWindow } from "./windows";

export interface PdfResult {
  ok: boolean;
  canceled?: boolean;
  path?: string;
  error?: string;
}

export async function exportReportPdf(
  html: string,
  suggestedName: string,
): Promise<PdfResult> {
  // Ephemeral non-persistent session — blocks all network requests so
  // renderer-supplied HTML cannot trigger outbound fetches via img/link/iframe.
  const partition = `pdf-export-${Date.now()}`;
  const pdfSession = session.fromPartition(partition, { cache: false });
  pdfSession.webRequest.onBeforeRequest((details, callback) => {
    // Allow the initial data: URL load; cancel everything else.
    callback({ cancel: !details.url.startsWith("data:") });
  });

  const win = new BrowserWindow({
    show: false,
    width: 794,
    height: 1123,
    webPreferences: {
      session: pdfSession,
      offscreen: true,
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      javascript: false,
    },
  });

  try {
    await win.loadURL(
      `data:text/html;charset=utf-8,${encodeURIComponent(html)}`,
    );

    const pdf = await win.webContents.printToPDF({
      printBackground: true,
      pageSize: "A4",
      margins: { top: 0, bottom: 0, left: 0, right: 0 },
      preferCSSPageSize: true,
    });

    const parent = getMainWindow();
    const result = await dialog.showSaveDialog(
      parent && !parent.isDestroyed() ? parent : win,
      {
        title: "Export report as PDF",
        defaultPath: suggestedName,
        filters: [{ name: "PDF Document", extensions: ["pdf"] }],
      },
    );

    if (result.canceled || !result.filePath) {
      return { ok: false, canceled: true };
    }

    await writeFile(result.filePath, pdf);
    return { ok: true, path: result.filePath };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  } finally {
    if (!win.isDestroyed()) win.destroy();
  }
}
