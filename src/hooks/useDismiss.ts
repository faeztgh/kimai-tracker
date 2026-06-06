import { useEffect, useRef } from "react";

export function useDismiss(
  enabled: boolean,
  refs: ReadonlyArray<{ readonly current: Element | null }>,
  onDismiss: () => void,
): void {
  const cb = useRef(onDismiss);
  cb.current = onDismiss;
  const refsRef = useRef(refs);
  refsRef.current = refs;

  useEffect(() => {
    if (!enabled) return;
    const inside = (target: Node) =>
      refsRef.current.some((r) => r.current?.contains(target));
    const onDoc = (e: MouseEvent) => {
      if (!inside(e.target as Node)) cb.current();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") cb.current();
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [enabled]);
}
