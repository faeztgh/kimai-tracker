import { formatMoney, incomeOf } from "../lib/format";
import { useSettings } from "../store/settings";

export function useIncome() {
  const hourlyRate = useSettings((s) => s.hourlyRate);
  const currency = useSettings((s) => s.currency);
  const showIncome = useSettings((s) => s.showIncome);
  const targetCurrency = useSettings((s) => s.targetCurrency);
  const exchangeRate = useSettings((s) => s.exchangeRate);
  const hasRate = hourlyRate > 0 && showIncome;
  const hasConversion =
    hasRate && targetCurrency.trim().length > 0 && exchangeRate > 0;
  const money = (seconds: number) =>
    formatMoney(incomeOf(seconds, hourlyRate), currency);
  const moneyConverted = (seconds: number) =>
    formatMoney(incomeOf(seconds, hourlyRate) * exchangeRate, targetCurrency);
  return {
    hasRate,
    money,
    moneyConverted,
    hasConversion,
    hourlyRate,
    currency,
    targetCurrency,
    exchangeRate,
  };
}
