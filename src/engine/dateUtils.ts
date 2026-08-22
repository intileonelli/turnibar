import { ShiftPreference, Weekday } from '@/src/models';

/**
 * Converte un orario in minuti dalla mezzanotte, per confronti numerici semplici. Accetta sia
 * "HH:mm" che "HH.mm" (e ore/minuti con o senza zero iniziale, es. "6.30"), così un orario
 * inserito con un formato leggermente diverso non rompe silenziosamente l'ordinamento o i
 * calcoli di durata (portando a NaN).
 */
export function timeToMinutes(time: string): number {
  const match = time.trim().match(/^(\d{1,2})[:.](\d{1,2})$/);
  if (!match) return 0;
  const h = Number(match[1]);
  const m = Number(match[2]);
  return h * 60 + m;
}

export function rangesOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string
): boolean {
  return timeToMinutes(startA) < timeToMinutes(endB) && timeToMinutes(startB) < timeToMinutes(endA);
}

export function shiftDurationHours(startTime: string, endTime: string): number {
  return (timeToMinutes(endTime) - timeToMinutes(startTime)) / 60;
}

/**
 * Categoria di fascia oraria di un turno, in base all'orario di inizio.
 * Soglie allineate all'esempio tipico da negozio: mattina 9-13, pomeriggio 13-17, sera 17-21.
 */
export function shiftPreferenceCategory(startTime: string): ShiftPreference {
  const minutes = timeToMinutes(startTime);
  if (minutes < timeToMinutes('13:00')) return 'mattina';
  if (minutes < timeToMinutes('17:00')) return 'pomeriggio';
  return 'sera';
}

/** Restituisce la data "YYYY-MM-DD" del weekday indicato nella settimana che inizia lunedì weekStartDate. */
export function dateForWeekday(weekStartDate: string, weekday: Weekday): string {
  const [year, month, day] = weekStartDate.split('-').map(Number);
  const monday = new Date(Date.UTC(year, month - 1, day));
  monday.setUTCDate(monday.getUTCDate() + (weekday - 1));
  const yyyy = monday.getUTCFullYear();
  const mm = String(monday.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(monday.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
