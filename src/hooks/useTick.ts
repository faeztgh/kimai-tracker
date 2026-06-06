import { useEffect, useState } from "react";

export function useTick(enabled: boolean): number {
  const [, setN] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => setN((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [enabled]);
  return Date.now();
}
