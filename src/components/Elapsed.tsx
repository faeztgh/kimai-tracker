import { useEffect, useState } from "react";
import { formatElapsed, secondsSince } from "../lib/format";
import { AnimatedNumber } from "./AnimatedNumber";

interface Props {
  begin: string;
  className?: string;
}

export function Elapsed({ begin, className }: Props) {
  const [seconds, setSeconds] = useState(() => secondsSince(begin));

  useEffect(() => {
    setSeconds(secondsSince(begin));
    const id = setInterval(() => setSeconds(secondsSince(begin)), 1000);
    return () => clearInterval(id);
  }, [begin]);

  return (
    <AnimatedNumber value={formatElapsed(seconds)} className={className} />
  );
}
