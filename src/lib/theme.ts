export type ThemeMode = "system" | "light" | "dark";

let current: ThemeMode = "system";
let mediaBound = false;

function prefersDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function apply(): void {
  const dark = current === "dark" || (current === "system" && prefersDark());
  document.documentElement.classList.toggle("dark", dark);
  document.documentElement.style.colorScheme = dark ? "dark" : "light";
}

export function setTheme(mode: ThemeMode): void {
  current = mode;
  if (!mediaBound) {
    mediaBound = true;
    window
      .matchMedia("(prefers-color-scheme: dark)")
      .addEventListener("change", () => {
        if (current === "system") apply();
      });
  }
  apply();
}

export const ACCENTS = [
  { id: "blue", label: "Blue", hex: "#3b82f6" },
  { id: "violet", label: "Violet", hex: "#8b5cf6" },
  { id: "emerald", label: "Emerald", hex: "#10b981" },
  { id: "rose", label: "Rose", hex: "#f43f5e" },
  { id: "amber", label: "Amber", hex: "#f59e0b" },
  { id: "sky", label: "Sky", hex: "#0ea5e9" },
] as const;

export type AccentName = (typeof ACCENTS)[number]["id"];

export function setAccent(name: AccentName): void {
  document.documentElement.setAttribute("data-accent", name);
}
