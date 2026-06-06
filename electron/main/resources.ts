import { join } from "node:path";
import { app } from "electron";

export function resourcePath(...segments: string[]): string {
  const base = app.isPackaged
    ? join(process.resourcesPath, "resources")
    : join(app.getAppPath(), "resources");
  return join(base, ...segments);
}
