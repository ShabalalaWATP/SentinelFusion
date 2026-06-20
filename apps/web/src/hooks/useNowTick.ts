import { useEffect, useState } from "react";

export function useNowTick(enabled: boolean = true, intervalMs: number = 15_000): number {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setNowMs(Date.now());
    }, intervalMs);

    return () => window.clearInterval(intervalId);
  }, [enabled, intervalMs]);

  return nowMs;
}
