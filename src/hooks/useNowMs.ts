import { useCallback, useEffect, useState } from 'react';

/**
 * Hook compartilhado que mantém o timestamp atual (`nowMs`) sincronizado em memória,
 * permitindo recalcular estados e filtros temporais enquanto a página permanece aberta.
 */
export function useNowMs(intervalMs = 30_000): { nowMs: number; syncNow: () => void } {
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  const syncNow = useCallback(() => {
    setNowMs(Date.now());
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs]);

  return { nowMs, syncNow };
}
