import { Notification } from "electron";
import { getActiveSettings } from "./connection";
import { resourcePath } from "./resources";
import { showMain } from "./windows";

let timer: ReturnType<typeof setTimeout> | null = null;
let firedFor: string | null = null;

export function showNotification(title: string, body: string): void {
  if (!Notification.isSupported()) return;
  const n = new Notification({ title, body, icon: resourcePath("icon.png") });
  n.on("click", () => showMain());
  n.show();
}

function clearScheduled(): void {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
}

function notifyLongRunning(hours: number): void {
  showNotification(
    "Kimai timer still running",
    `Your timer has been running for over ${hours} ${
      hours === 1 ? "hour" : "hours"
    }. Don't forget to stop it.`,
  );
}

export function updateReminder(
  running: boolean,
  beginIso: string | null,
): void {
  if (!running || !beginIso) {
    clearScheduled();
    firedFor = null;
    return;
  }

  const hours = getActiveSettings()?.reminderHours ?? 8;
  if (!hours || hours <= 0) {
    clearScheduled();
    return;
  }
  if (firedFor === beginIso) return;

  const begin = new Date(beginIso).getTime();
  if (Number.isNaN(begin)) return;

  clearScheduled();
  const delay = begin + hours * 3_600_000 - Date.now();
  const fire = () => {
    firedFor = beginIso;
    timer = null;
    notifyLongRunning(hours);
  };
  if (delay <= 0) fire();
  else timer = setTimeout(fire, Math.min(delay, 2_000_000_000));
}

export function notifyUpdateReady(version?: string): void {
  showNotification(
    "Update ready",
    version
      ? `Kimai Tracker ${version} will install when you quit.`
      : "An update will install when you quit.",
  );
}
