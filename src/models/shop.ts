import { Weekday } from './weekday';

/** Orario di apertura del negozio per un giorno della settimana. */
export interface OpeningHours {
  id: string;
  weekday: Weekday;
  closed: boolean;
  /** Orario in formato "HH:mm", ignorato se closed è true. */
  openTime: string;
  /** Orario in formato "HH:mm", ignorato se closed è true. */
  closeTime: string;
}

/** Numero di dipendenti richiesti per un ruolo in un turno tipo. */
export interface RoleRequirement {
  roleId: string;
  count: number;
}

/** Turno tipo da coprire in un giorno della settimana (es. "Mattina 9-13"). */
export interface ShiftTemplate {
  id: string;
  weekday: Weekday;
  name: string;
  /** Orario in formato "HH:mm". */
  startTime: string;
  /** Orario in formato "HH:mm". */
  endTime: string;
  requirements: RoleRequirement[];
}
