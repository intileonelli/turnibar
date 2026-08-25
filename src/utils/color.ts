/** Colore del testo (nero o bianco) che garantisce buon contrasto su uno sfondo esadecimale dato. */
export function getContrastTextColor(hex: string): '#000000' | '#FFFFFF' {
  const normalized = hex.replace('#', '');
  const r = parseInt(normalized.substring(0, 2), 16) / 255;
  const g = parseInt(normalized.substring(2, 4), 16) / 255;
  const b = parseInt(normalized.substring(4, 6), 16) / 255;
  // Luminanza relativa approssimata (percezione dell'occhio umano pesa il verde di più).
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
  return luminance > 0.55 ? '#000000' : '#FFFFFF';
}
