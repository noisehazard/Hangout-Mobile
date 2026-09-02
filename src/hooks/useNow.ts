import { useEffect, useState } from 'react';

/**
 * A clock that re-renders on an interval.
 *
 * Anything that decides "is this live?" or renders "in 12m" has to read the
 * time from here rather than calling Date.now() during render — otherwise the
 * value is computed once and the UI keeps claiming a hangout is upcoming long
 * after it has started.
 */
export function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
}
