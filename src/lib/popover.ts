export function flipPosition(
  rect: DOMRect,
  width: number,
  height: number,
  align: "left" | "right" = "left",
  gap = 4,
): { top: number; left: number } {
  const top =
    rect.bottom + gap + height > window.innerHeight
      ? rect.top - height - gap
      : rect.bottom + gap;
  const left =
    align === "right"
      ? Math.max(8, rect.right - width)
      : Math.min(Math.max(8, rect.left), window.innerWidth - width - 8);
  return { top, left };
}
