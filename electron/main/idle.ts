import { powerMonitor } from "electron";
import { getActiveSettings } from "./connection";
import { getMainWindow, showMain } from "./windows";

let interval: ReturnType<typeof setInterval> | null = null;
let running = false;
let wasIdle = false;
let idleSinceMs: number | null = null;

const POLL_MS = 15_000;

function thresholdSeconds(): number {
  const min = getActiveSettings()?.idleThresholdMinutes ?? 10;
  return min > 0 ? min * 60 : 0;
}

function tick(): void {
  const threshold = thresholdSeconds();
  if (!running || threshold <= 0) {
    wasIdle = false;
    idleSinceMs = null;
    return;
  }

  const idle = powerMonitor.getSystemIdleTime();
  if (idle >= threshold) {
    wasIdle = true;
    idleSinceMs = Date.now() - idle * 1000;
  } else if (wasIdle) {
    const since = idleSinceMs ?? Date.now();
    const minutes = Math.round((Date.now() - since) / 60_000);
    wasIdle = false;
    idleSinceMs = null;
    if (minutes >= 1) {
      showMain();
      getMainWindow()?.webContents.send("idle:detected", {
        minutes,
        sinceIso: new Date(since).toISOString(),
      });
    }
  }
}

export function startIdleWatch(): void {
  if (interval) return;
  interval = setInterval(tick, POLL_MS);
}

export function setTimerRunning(isRunning: boolean): void {
  running = isRunning;
  if (!isRunning) {
    wasIdle = false;
    idleSinceMs = null;
  }
}
