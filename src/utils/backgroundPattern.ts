export type BackgroundPatternId = 'none' | 'hex' | 'diamonds' | 'confetti' | 'dots';

export const BACKGROUND_PATTERN_OPTIONS: { id: BackgroundPatternId; label: string }[] = [
  { id: 'none', label: 'Nessuno (colore pieno)' },
  { id: 'hex', label: "Nido d'ape" },
  { id: 'diamonds', label: 'Rombi incrociati' },
  { id: 'confetti', label: 'Confetti geometrico' },
  { id: 'dots', label: 'Puntini' },
];

/** Codifica in base64, evitando i problemi di escaping di virgolette/parentesi non codificate
 * che encodeURIComponent lascerebbe intatte (romperebbero l'attributo "background" che le usa).
 * Chiamata solo sul web (unico posto dove i motivi vengono effettivamente resi, vedi
 * ScreenBackground), dove "btoa" è sempre disponibile. */
function svgUrl(svg: string): string {
  return `url(data:image/svg+xml;base64,${btoa(svg)})`;
}

/** Esagoni: solo linee (nessun riempimento), con un piccolo rilievo 3D (ombra scura + luce
 * chiara sulla stessa linea) invece che piatte; righe alternate nei due colori dell'azienda. */
function hexBackground(primary: string, accent: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24.249" height="42" viewBox="0 0 24.249 42"><g fill="none" stroke-linejoin="round"><g transform="translate(0.6,0.9)" stroke="#000000" stroke-opacity="0.28" stroke-width="1.6"><polygon points="0,0 12.12,7.0 12.12,21.0 0,28 -12.12,21.0 -12.12,7.0"/><polygon points="24.25,0 36.37,7.0 36.37,21.0 24.25,28 12.12,21.0 12.12,7.0"/><polygon points="12.12,21.0 24.25,28.0 24.25,42.0 12.12,49.0 0.0,42.0 0.0,28.0"/></g><g transform="translate(-0.4,-0.6)" stroke="#ffffff" stroke-opacity="0.75" stroke-width="1.3"><polygon points="0,0 12.12,7.0 12.12,21.0 0,28 -12.12,21.0 -12.12,7.0"/><polygon points="24.25,0 36.37,7.0 36.37,21.0 24.25,28 12.12,21.0 12.12,7.0"/><polygon points="12.12,21.0 24.25,28.0 24.25,42.0 12.12,49.0 0.0,42.0 0.0,28.0"/></g><g stroke-width="1.6"><polygon points="0,0 12.12,7.0 12.12,21.0 0,28 -12.12,21.0 -12.12,7.0" stroke="${primary}"/><polygon points="24.25,0 36.37,7.0 36.37,21.0 24.25,28 12.12,21.0 12.12,7.0" stroke="${primary}"/><polygon points="12.12,21.0 24.25,28.0 24.25,42.0 12.12,49.0 0.0,42.0 0.0,28.0" stroke="${accent}"/></g></g></svg>`;
  return `${svgUrl(svg)} 0 0/24.249px 42px repeat`;
}

/** Rombi incrociati: due diagonali (una per colore), con lo stesso rilievo 3D degli esagoni. */
function diamondsBackground(primary: string, accent: string): string {
  return [
    'repeating-linear-gradient(45deg, transparent 0 16.4px, rgba(0,0,0,0.22) 16.4px 17px, transparent 17px 17.6px, rgba(255,255,255,0.55) 17.6px 18.2px, transparent 18.2px 36px)',
    'repeating-linear-gradient(-45deg, transparent 0 16.4px, rgba(0,0,0,0.22) 16.4px 17px, transparent 17px 17.6px, rgba(255,255,255,0.55) 17.6px 18.2px, transparent 18.2px 36px)',
    `repeating-linear-gradient(45deg, transparent 0 17px, ${primary} 17px 18.2px, transparent 18.2px 36px)`,
    `repeating-linear-gradient(-45deg, transparent 0 17px, ${accent} 17px 18.2px, transparent 18.2px 36px)`,
  ].join(', ');
}

/** Forme sparse (cerchi, croci, triangoli) in stile "confetti", con una piccola ombra. */
function confettiBackground(primary: string, accent: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="84" height="84" viewBox="0 0 84 84"><defs><filter id="ds" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="1.5" stdDeviation="1.1" flood-color="#000000" flood-opacity="0.28"/></filter></defs><g filter="url(#ds)" stroke-width="2.2" stroke-linecap="round"><circle cx="14" cy="16" r="5" fill="${accent}"/><path d="M40 8 l6 6 M46 8 l-6 6" stroke="${primary}" fill="none"/><polygon points="66,10 72,20 60,20" fill="none" stroke="${primary}"/><circle cx="60" cy="50" r="3" fill="${primary}"/><path d="M12 52 l6 6 M18 52 l-6 6" stroke="${accent}" fill="none"/><circle cx="36" cy="60" r="6.5" fill="none" stroke="${accent}"/><polygon points="78,54 84,64 72,64" fill="none" stroke="${accent}"/><circle cx="80" cy="34" r="2.4" fill="${primary}"/></g></svg>`;
  return `${svgUrl(svg)} 0 0/84px 84px repeat`;
}

/** Puntini discreti, in un solo colore (il primario). */
function dotsBackground(primary: string): string {
  return `radial-gradient(${primary} 2.4px, transparent 2.8px) 0 0/16px 16px repeat`;
}

/**
 * Valore CSS "background" (proprietà composita) per il motivo scelto, pronto per uno style di
 * react-native-web — le proprietà separate (backgroundImage, backgroundSize, ecc.) non sono
 * supportate da react-native-web, solo la scorciatoia "background". Nessun equivalente pratico
 * su nativo (niente CSS): lì il motivo viene ignorato e resta solo il velo di colore pieno.
 */
export function backgroundPatternCss(
  pattern: BackgroundPatternId,
  primary: string,
  accent: string
): string | null {
  switch (pattern) {
    case 'hex':
      return hexBackground(primary, accent);
    case 'diamonds':
      return diamondsBackground(primary, accent);
    case 'confetti':
      return confettiBackground(primary, accent);
    case 'dots':
      return dotsBackground(primary);
    default:
      return null;
  }
}
