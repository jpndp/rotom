import { useState, useEffect, useCallback } from 'react';

export function useCooldown() {
  const [until, setUntil] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    if (until <= 0) return undefined;
    const id = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((until - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining === 0) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [until]);

  const start = useCallback((seconds = 60) => {
    const duration = Math.max(0, seconds);
    setSecondsLeft(duration);
    setUntil(duration > 0 ? Date.now() + duration * 1000 : 0);
  }, []);

  return { secondsLeft, active: secondsLeft > 0, start };
}
