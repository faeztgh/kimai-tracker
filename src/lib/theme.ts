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

export const FONT_SIZES = [
  { id: "small", percent: "87.5%" },
  { id: "default", percent: "100%" },
  { id: "large", percent: "112.5%" },
  { id: "xlarge", percent: "125%" },
] as const;

export type FontSize = (typeof FONT_SIZES)[number]["id"];

export const FONT_FAMILIES = [
  {
    id: "system",
    stack:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  },
  {
    id: "inter",
    stack:
      'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  },
  {
    id: "segoe",
    stack: '"Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, sans-serif',
  },
  {
    id: "roboto",
    stack:
      'Roboto, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
  },
  {
    id: "serif",
    stack: 'Georgia, "Times New Roman", Times, serif',
  },
  {
    id: "mono",
    stack:
      'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
  },
] as const;

export type FontFamilyId = (typeof FONT_FAMILIES)[number]["id"];

function fontSizePercent(size: FontSize): string {
  return FONT_SIZES.find((s) => s.id === size)?.percent ?? "100%";
}

function fontFamilyStack(id: FontFamilyId): string {
  return (
    FONT_FAMILIES.find((f) => f.id === id)?.stack ?? FONT_FAMILIES[1].stack
  );
}

export function setFontSize(size: FontSize): void {
  document.documentElement.style.fontSize = fontSizePercent(size);
}

export function setFontFamily(id: FontFamilyId): void {
  document.documentElement.style.setProperty(
    "--app-font-family",
    fontFamilyStack(id),
  );
}
