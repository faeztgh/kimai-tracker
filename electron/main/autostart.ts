import { app } from "electron";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const LINUX_DIR = join(homedir(), ".config", "autostart");
const LINUX_FILE = join(LINUX_DIR, "kimai-tracker.desktop");

export function getAutostart(): boolean {
  if (process.platform === "linux") return existsSync(LINUX_FILE);
  try {
    return app.getLoginItemSettings().openAtLogin;
  } catch {
    return false;
  }
}

export function setAutostart(enabled: boolean): boolean {
  if (process.platform === "linux") {
    try {
      if (enabled) {
        mkdirSync(LINUX_DIR, { recursive: true });
        const desktop = [
          "[Desktop Entry]",
          "Type=Application",
          "Name=Kimai Tracker",
          `Exec=${process.execPath} --hidden`,
          "Terminal=false",
          "X-GNOME-Autostart-enabled=true",
          "",
        ].join("\n");
        writeFileSync(LINUX_FILE, desktop, "utf8");
      } else {
        rmSync(LINUX_FILE, { force: true });
      }
      return enabled;
    } catch (err) {
      console.error("[autostart] linux toggle failed:", err);
      return getAutostart();
    }
  }

  try {
    app.setLoginItemSettings({
      openAtLogin: enabled,
      openAsHidden: true,
      args: ["--hidden"],
    });
    return enabled;
  } catch (err) {
    console.error("[autostart] toggle failed:", err);
    return getAutostart();
  }
}
