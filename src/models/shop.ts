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

/**
 * Numero di dipendenti richiesti in un turno tipo, con i ruoli accettabili in ordine di
 * priorità: roleIds[0] è il ruolo principale, gli altri sono alternative usate solo quando
 * il principale non è disponibile (es. Cuoca, altrimenti Barista esperto).
 */
export interface RoleRequirement {
  roleIds: string[];
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

/** Impostazioni generali del negozio. */
export interface ShopSettings {
  /** Numero massimo di dipendenti che possono essere in ferie nello stesso giorno, opzionale. */
  maxDailyTimeOff?: number;
  /** Se un dipendente può essere assegnato a più di un turno nello stesso giorno (turni spezzati). */
  allowMultipleShiftsPerDay: boolean;
}
