import { useEffect, useState } from "react";
import { Setup } from "./screens/Setup";
import { TrackerView } from "./screens/TrackerView";
import { Dashboard } from "./screens/Dashboard";
import { Reports } from "./screens/Reports";
import { Settings } from "./screens/Settings";
import { Logo } from "./components/Logo";
import { ConfirmProvider } from "./components/ConfirmDialog";
import { IdleWatcher } from "./components/IdleWatcher";
import { activeAlias, useSettings } from "./store/settings";
import { useTrayBridge } from "./hooks/useTrayBridge";
import { toggleFloating } from "./lib/windows";

type View = "tracker" | "dashboard" | "reports" | "settings";

const TABS: { id: View; label: string }[] = [
  { id: "tracker", label: "Timer" },
  { id: "dashboard", label: "Dashboard" },
  { id: "reports", label: "Reports" },
];

export default function App() {
  return (
    <ConfirmProvider>
      <IdleWatcher />
      <AppShell />
    </ConfirmProvider>
  );
}

function AppShell() {
  const loaded = useSettings((s) => s.loaded);
  const configured = useSettings((s) => s.configured);
  const load = useSettings((s) => s.load);
  const alias = useSettings(activeAlias);
  const [view, setView] = useState<View>("tracker");

  useTrayBridge();

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    return window.api.on("goto-settings", () => setView("settings"));
  }, []);

  if (!loaded) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-100 text-sm text-gray-400 dark:bg-gray-900 dark:text-gray-500">
        Loading…
      </div>
    );
  }

  if (!configured) return <Setup />;

  if (view === "settings") {
    return <Settings onBack={() => setView("tracker")} />;
  }

  return (
    <div className="flex h-full flex-col bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100">
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-3.5 py-2.5 dark:border-gray-800 dark:bg-gray-800">
        <div className="flex items-center gap-2">
          <Logo />
          <span className="max-w-[220px] truncate text-sm font-semibold text-gray-800 dark:text-gray-100" title={alias}>
            {alias}
          </span>
        </div>
        <div className="flex items-center gap-0.5">
          <IconButton title="Pin floating window" onClick={() => toggleFloating()}>
            <PinIcon />
          </IconButton>
          <IconButton title="Settings" onClick={() => setView("settings")}>
            <GearIcon />
          </IconButton>
        </div>
      </header>

      <nav className="flex border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-800">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setView(t.id)}
            className={`flex-1 border-b-2 px-2 py-2 text-xs font-medium transition ${
              view === t.id
                ? "border-accent-500 text-accent-600 dark:text-accent-400"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div className="flex-1 overflow-hidden">
        <div key={view} className="anim-fade-in h-full">
          {view === "tracker" && <TrackerView />}
          {view === "dashboard" && <Dashboard />}
          {view === "reports" && <Reports />}
        </div>
      </div>
    </div>
  );
}

function IconButton({
  title,
  onClick,
  children,
}: {
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700
        dark:hover:bg-gray-700 dark:hover:text-gray-200"
    >
      {children}
    </button>
  );
}

function PinIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="17" x2="12" y2="22" />
      <path d="M5 17h14l-1.5-3V8a2 2 0 0 0-2-2h-7a2 2 0 0 0-2 2v6L5 17z" />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}
