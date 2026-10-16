'use client';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

// ?f=<папка>&i=<запись>: открыть папку, прокрутить к записи и ненадолго подсветить её
export function useDeepLink(ready: boolean) {
  const sp = useSearchParams();
  const f = sp.get('f'), i = sp.get('i');
  const [flash, setFlash] = useState<string | null>(null);
  useEffect(() => {
    if (!ready || !i) return;
    setFlash(i);
    const a = setTimeout(() => document.getElementById('i-' + i)?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 120);
    const b = setTimeout(() => setFlash(null), 3000);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, [ready, f, i]);
  return { f, i, flash };
}
