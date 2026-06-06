import { app } from "electron";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";

let cache: Record<string, unknown> | null = null;
let filePath = "";

function file(): string {
  if (!filePath) filePath = join(app.getPath("userData"), "prefs.json");
  return filePath;
}

function read(): Record<string, unknown> {
  if (cache) return cache;
  try {
    cache = existsSync(file())
      ? (JSON.parse(readFileSync(file(), "utf8")) as Record<string, unknown>)
      : {};
  } catch {
    cache = {};
  }
  return cache;
}

function flush(): void {
  try {
    mkdirSync(dirname(file()), { recursive: true });
    writeFileSync(file(), JSON.stringify(cache ?? {}, null, 2), "utf8");
  } catch (err) {
    console.error("[prefs] write failed:", err);
  }
}

export const prefs = {
  get<T>(key: string, fallback: T): T {
    const value = read()[key];
    return value === undefined ? fallback : (value as T);
  },
  set(key: string, value: unknown): void {
    read()[key] = value;
    flush();
  },
  delete(key: string): void {
    delete read()[key];
    flush();
  },
};
