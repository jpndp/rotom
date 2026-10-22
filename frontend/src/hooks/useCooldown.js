import { useState, useEffect, useCallback } from 'react';

export function useCooldown() {
  const [until, setUntil] = useState(0);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (until <= Date.now()) return undefined;
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= until) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [until]);

  const secondsLeft = Math.max(0, Math.ceil((until - now) / 1000));
  const start = useCallback((seconds = 60) => {
    const t = Date.now();
    setNow(t);
    setUntil(t + seconds * 1000);
  }, []);

  return { secondsLeft, active: secondsLeft > 0, start };
}