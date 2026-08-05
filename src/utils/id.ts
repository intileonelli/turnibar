/** Genera un id univoco locale, senza dipendenze native (funziona anche in Jest/Node). */
export function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
