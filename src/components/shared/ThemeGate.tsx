import { PropsWithChildren, useEffect } from 'react';
import { applyTheme } from './colors';
import { shopRepository } from '@/src/db/repositories';
import { useThemeStore } from '@/src/store/themeStore';
import { useCurrentAuth } from '@/src/context/AuthContext';

/**
 * Carica una volta i colori/sfondo scelti dall'azienda e li applica (vedi applyTheme), sovrapposti
 * alle preferenze personali dell'account collegato quando presenti (stesso criterio già usato per
 * dimensione/colore del testo: la scelta personale, se impostata, vince solo per quell'account).
 * Non blocca il render: la primissima schermata usa i colori di default finché non arrivano quelli
 * personalizzati, poi l'app si aggiorna da sola grazie al bump dello themeStore.
 */
export function ThemeGate({ children }: PropsWithChildren) {
  const bump = useThemeStore((s) => s.bump);
  const { profile } = useCurrentAuth();

  useEffect(() => {
    let cancelled = false;
    shopRepository.getShopSettings().then((settings) => {
      if (cancelled) return;
      applyTheme({ ...settings, ...profile?.personalTheme });
      bump();
    });
    return () => {
      cancelled = true;
    };
  }, [bump, profile]);

  return <>{children}</>;
}
