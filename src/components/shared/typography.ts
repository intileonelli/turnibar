/**
 * Scala del testo scelta personalmente da chi è collegato (impostazione personale, non
 * dell'azienda), 1 = dimensione normale. Applicata con uno zoom CSS sull'intera app (solo web):
 * ingrandisce testo e controlli insieme in modo coerente, senza dover moltiplicare ogni singolo
 * fontSize sparso nell'app (che non esiste come valore centralizzato).
 */
export const typographyState = { scale: 1 };

export function applyFontScale(scale: number | undefined): void {
  typographyState.scale = scale ?? 1;
}
