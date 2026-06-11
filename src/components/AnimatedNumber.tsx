import { useEffect, useRef, useState } from "react";
import { useSettings } from "../store/settings";

interface Props {
  value: string;
  className?: string;
}

export function AnimatedNumber({ value, className }: Props) {
  const animate = useSettings((s) => s.animateDigits);
  if (!animate) {
    return <span className={className}>{value}</span>;
  }
  return (
    <span className={className}>
      {value.split("").map((ch, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: characters are positional
        <RollChar key={i} ch={ch} />
      ))}
    </span>
  );
}

const NBSP = " ";
const show = (c: string) => (c === " " ? NBSP : c);

function RollChar({ ch }: { ch: string }) {
  const prev = useRef(ch);
  const seq = useRef(0);
  const [pair, setPair] = useState<{
    from: string;
    to: string;
    k: number;
  } | null>(null);

  useEffect(() => {
    if (prev.current === ch) return;
    const from = prev.current;
    prev.current = ch;
    seq.current += 1;
    setPair({ from, to: ch, k: seq.current });
    const id = window.setTimeout(() => setPair(null), 380);
    return () => window.clearTimeout(id);
  }, [ch]);

  if (!pair) {
    return (
      <span className="roll-cell">
        <span className="roll-line">{show(ch)}</span>
      </span>
    );
  }

  return (
    <span className="roll-cell">
      <span key={pair.k} className="roll-track roll-anim">
        <span className="roll-line">{show(pair.from)}</span>
        <span className="roll-line">{show(pair.to)}</span>
      </span>
    </span>
  );
}
