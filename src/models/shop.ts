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
  /** Fascia oraria (id di una ShiftCategory dell'azienda) a cui appartiene questo turno. */
  categoryId: string;
  /**
   * Ordine di visualizzazione tra i turni dello stesso giorno della settimana (non l'orario):
   * così la sequenza resta la stessa ogni giorno anche se gli orari esatti variano leggermente.
   * Non impostato = usa l'ordine per orario come prima (solo per compatibilità/test: la riga del
   * database ha sempre un valore).
   */
  sortOrder?: number;
}

/** Impostazioni generali del negozio. */
export interface ShopSettings {
  /** Numero massimo di dipendenti che possono essere in ferie nello stesso giorno, opzionale. */
  maxDailyTimeOff?: number;
  /** Se un dipendente può essere assegnato a più di un turno nello stesso giorno (turni spezzati). */
  allowMultipleShiftsPerDay: boolean;
  /** Colore principale dell'app (pulsanti, elementi attivi), qualsiasi colore. Non impostato = colore di default. */
  primaryColor?: string;
  /** Colore secondario/accento dell'app, qualsiasi colore. Non impostato = colore di default. */
  accentColor?: string;
  /** Colore di sfondo dell'app (velo sull'intera schermata), qualsiasi colore. Non impostato = usa il colore principale. */
  backgroundColor?: string;
  /** Opacità del velo di sfondo, 0-100. Non impostato o 0 = nessuno sfondo visibile. */
  backgroundOpacity?: number;
  /** Intensità delle ombre (Card, pulsanti, ecc.), 0-100+. Non impostato = 100 (default dell'app). */
  shadowIntensity?: number;
}
