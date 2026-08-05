import { Weekday } from './weekday';

/** Indisponibilità ricorrente settimanale (es. "non disponibile il martedì mattina"). */
export interface Unavailability {
  id: string;
  employeeId: string;
  weekday: Weekday;
  /** Orario in formato "HH:mm". */
  startTime: string;
  /** Orario in formato "HH:mm". */
  endTime: string;
  note?: string;
}
