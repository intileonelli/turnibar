import { mixHex } from '@/src/utils/color';

export const colors = {
  background: '#F8FAFC',
  surface: '#FFFFFF',
  border: '#E2E8F0',
  text: '#0F172A',
  textMuted: '#64748B',
  primary: '#4F46E5',
  primaryMuted: '#EEF2FF',
  /** Colore secondario/accento personalizzabile (es. cerchi delle icone della Home). */
  accent: '#4F46E5',
  accentMuted: '#EEF2FF',
  danger: '#DC2626',
  dangerMuted: '#FEF2F2',
  warning: '#D97706',
  warningMuted: '#FFFBEB',
  success: '#16A34A',
  successMuted: '#F0FDF4',
};

export const ROLE_COLOR_PALETTE = [
  '#4F46E5',
  '#0EA5E9',
  '#16A34A',
  '#D97706',
  '#DB2777',
  '#7C3AED',
  '#DC2626',
  '#0D9488',
];

/** Mescola un colore con il bianco per ottenere una tinta chiara e leggibile (es. sfondo di badge/pulsanti secondari). */
function lightTint(hex: string, whiteRatio = 0.88): string {
  const normalized = hex.replace('#', '');
  const r = parseInt(normalized.substring(0, 2), 16);
  const g = parseInt(normalized.substring(2, 4), 16);
  const b = parseInt(normalized.substring(4, 6), 16);
  const mix = (channel: number) => Math.round(255 * whiteRatio + channel * (1 - whiteRatio));
  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(mix(r))}${toHex(mix(g))}${toHex(mix(b))}`.toUpperCase();
}

const DEFAULT_PRIMARY = '#4F46E5';
const DEFAULT_ACCENT = '#4F46E5';
const DEFAULT_TEXT = '#0F172A';
const DEFAULT_BACKGROUND = '#F8FAFC';

const DEFAULT_SHADOW_INTENSITY = 100;

/**
 * Colore/opacità dello sfondo decorativo scelti dall'azienda, e lo stesso colore già "mescolato"
 * sopra lo sfondo di base (chromeBackground): serve per l'intestazione e la barra di navigazione
 * in basso, che sono fuori dalle singole schermate e quindi non possono usare l'overlay
 * trasparente (ScreenBackground) — devono invece avere già il colore finale pronto, altrimenti
 * con un colore testo personalizzato bianco resterebbero su uno sfondo chiaro illeggibile.
 *
 * `shadowIntensity` è un moltiplicatore (1 = intensità di default dell'app, 0 = nessuna ombra):
 * i componenti con ombra (Card, Button, IconTile, WeeklyShiftGrid) lo leggono ad ogni render e lo
 * applicano alla propria opacità base.
 */
export const themeState = {
  backgroundColor: DEFAULT_PRIMARY,
  backgroundOpacity: 0,
  chromeBackground: DEFAULT_BACKGROUND,
  shadowIntensity: DEFAULT_SHADOW_INTENSITY / 100,
};

/**
 * Applica i colori/sfondo scelti dall'azienda, mutando l'oggetto `colors` condiviso (importato
 * per riferimento in tutta l'app): non serve un Context/hook in ogni file, basta che qualcosa
 * a monte forzi un nuovo render dopo la chiamata (vedi src/store/themeStore.ts).
 */
export function applyTheme(settings: {
  primaryColor?: string;
  accentColor?: string;
  backgroundColor?: string;
  backgroundOpacity?: number;
  shadowIntensity?: number;
}): void {
  const primary = settings.primaryColor ?? DEFAULT_PRIMARY;
  const accent = settings.accentColor ?? DEFAULT_ACCENT;
  colors.primary = primary;
  colors.primaryMuted = lightTint(primary);
  colors.accent = accent;
  colors.accentMuted = lightTint(accent);
  const backgroundColor = settings.backgroundColor ?? primary;
  const backgroundOpacity = settings.backgroundOpacity ?? 0;
  themeState.backgroundColor = backgroundColor;
  themeState.backgroundOpacity = backgroundOpacity;
  themeState.chromeBackground = mixHex(DEFAULT_BACKGROUND, backgroundColor, Math.min(backgroundOpacity, 100) / 100);
  themeState.shadowIntensity = (settings.shadowIntensity ?? DEFAULT_SHADOW_INTENSITY) / 100;
}

/**
 * Applica il colore del testo scelto personalmente da chi è collegato (impostazione personale,
 * non dell'azienda): a differenza dei colori dell'azienda, molti componenti condivisi leggono
 * `colors.text`/`colors.textMuted` dentro StyleSheet.create valutati una sola volta, quindi il
 * cambiamento richiede un ricaricamento della pagina per essere visibile ovunque in modo
 * affidabile (vedi src/hooks/useFontSettings.ts).
 */
export function applyFontColor(hex: string | undefined): void {
  const text = hex ?? DEFAULT_TEXT;
  colors.text = text;
  // Testo "attenuato": stesso colore scelto, con trasparenza (formato #RRGGBBAA supportato da RN).
  colors.textMuted = `${text}AA`;
}
