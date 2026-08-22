import { Weekday } from './weekday';

export type ShiftPreference = 'mattina' | 'pomeriggio' | 'sera' | 'nessuna';

export const SHIFT_PREFERENCE_LABELS: Record<ShiftPreference, string> = {
  mattina: 'Mattina',
  pomeriggio: 'Pomeriggio',
  sera: 'Sera',
  nessuna: 'Nessuna preferenza',
};

export interface Employee {
  id: string;
  name: string;
  roleId: string;
  /** Ruolo secondario/di riserva, opzionale: usato se il ruolo principale non copre il requisito. */
  secondaryRoleId?: string;
  /** Ore contrattuali settimanali, opzionali: se impostate, usate come riferimento per la distribuzione equa delle ore. */
  weeklyContractHours?: number;
  /** Tetto massimo di ore assegnabili in una settimana (vincolo hard), opzionale: nessun limite se non impostato. */
  maxWeeklyHours?: number;
  /** Numero massimo di turni assegnabili in una settimana (vincolo hard), opzionale. */
  maxWeeklyShifts?: number;
  /** Numero massimo di giorni lavorativi in una settimana (vincolo hard), opzionale. */
  maxWeeklyDays?: number;
  /** Giorni della settimana preferiti (vincolo soft), opzionale: nessuna preferenza se vuoto/non impostato. */
  preferredWeekdays?: Weekday[];
  /** Preferenza di fascia oraria, vincolo soft. */
  preference: ShiftPreference;
  /**
   * Turni tipo a cui il dipendente va assegnato con priorità assoluta quando è idoneo (es.
   * "Inti il martedì fa sempre Sera 1"). Se il dipendente non è disponibile (ferie,
   * indisponibilità, altri vincoli hard), il turno viene comunque assegnato a qualcun altro
   * invece di restare scoperto.
   */
  pinnedShiftTemplateIds?: string[];
  /**
   * Numero massimo di turni per fascia oraria a settimana (vincolo hard), opzionale e
   * indipendente per fascia (es. Jack al massimo 4 turni di sera E al massimo 4 di mattina).
   */
  maxWeeklyShiftsByPreference?: Partial<Record<Exclude<ShiftPreference, 'nessuna'>, number>>;
  active: boolean;
}

/** Ruoli che il dipendente può coprire, in ordine di preferenza: principale ed eventuale secondario/di riserva. */
export function employeeRoleIds(employee: Pick<Employee, 'roleId' | 'secondaryRoleId'>): string[] {
  return employee.secondaryRoleId ? [employee.roleId, employee.secondaryRoleId] : [employee.roleId];
}
