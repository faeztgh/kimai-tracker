import { useTranslation } from "react-i18next";
import { EntryList } from "../components/EntryList";
import { TrackerBar } from "../components/TrackerBar";
import { useTotals } from "../hooks/useTotals";
import { formatDurationShort } from "../lib/format";
import { useSettings } from "../store/settings";

export function TrackerView() {
  const { t } = useTranslation();
  const totals = useTotals();
  const showSummary = useSettings((s) => s.showSummary);

  return (
    <div className="flex h-full flex-col">
      <TrackerBar />

      <div className="flex-1 overflow-y-auto">
        <EntryList />
      </div>

      {showSummary && (
        <footer
          className="grid grid-cols-3 divide-x divide-gray-200 border-t border-gray-200 bg-white
          dark:divide-gray-800 dark:border-gray-800 dark:bg-gray-800"
        >
          <Stat
            label={t("dashboard.today")}
            value={formatDurationShort(totals.today)}
          />
          <Stat
            label={t("dashboard.thisWeek")}
            value={formatDurationShort(totals.week)}
          />
          <Stat
            label={t("dashboard.thisMonth")}
            value={formatDurationShort(totals.month)}
          />
        </footer>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-2 py-2 text-center">
      <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
        {label}
      </p>
      <p className="mt-0.5 font-mono text-sm font-semibold tabular-nums text-gray-800 dark:text-gray-100">
        {value}
      </p>
    </div>
  );
}
