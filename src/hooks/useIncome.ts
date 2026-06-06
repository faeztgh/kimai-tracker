import { useSettings } from "../store/settings";
import { formatMoney, incomeOf } from "../lib/format";

export function useIncome() {
  const hourlyRate = useSettings((s) => s.hourlyRate);
  const currency = useSettings((s) => s.currency);
  const showIncome = useSettings((s) => s.showIncome);
  const hasRate = hourlyRate > 0 && showIncome;
  const money = (seconds: number) => formatMoney(incomeOf(seconds, hourlyRate), currency);
  return { hasRate, money, hourlyRate, currency };
}
