import { Ionicons } from '@expo/vector-icons';

/**
 * Icone condivise tra i pulsanti della Home e la barra di navigazione in basso, per coerenza
 * visiva tra i due menu.
 */
export const NAV_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  home: 'home',
  dipendenti: 'people',
  negozio: 'storefront',
  calendario: 'calendar',
  ferie: 'airplane',
};
