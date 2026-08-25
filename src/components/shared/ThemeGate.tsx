import { PropsWithChildren, useEffect } from 'react';
import { applyTheme } from './colors';
import { shopRepository } from '@/src/db/repositories';
import { useThemeStore } from '@/src/store/themeStore';

/**
 * Carica una volta i colori/sfondo scelti dall'azienda e li applica (vedi applyTheme). Non
 * blocca il render: la primissima schermata usa i colori di default finché non arrivano quelli
 * personalizzati, poi l'app si aggiorna da sola grazie al bump dello themeStore.
 */
export function ThemeGate({ children }: PropsWithChildren) {
  const bump = useThemeStore((s) => s.bump);

  useEffect(() => {
    let cancelled = false;
    shopRepository.getShopSettings().then((settings) => {
      if (cancelled) return;
      applyTheme(settings);
      bump();
    });
    return () => {
      cancelled = true;
    };
  }, [bump]);

  return <>{children}</>;
}
