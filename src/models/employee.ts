import { Weekday } from './weekday';

/**
 * Priorità del dipendente nella generazione automatica: "alta" viene preferito quando ci sono
 * più candidati idonei per lo stesso turno, "bassa" viene usato solo se serve davvero (nessun
 * candidato migliore disponibile), "normale" non cambia nulla rispetto al comportamento di base.
 */
export type EmployeePriority = 'alta' | 'normale' | 'bassa';

export const EMPLOYEE_PRIORITY_LABELS: Record<EmployeePriority, string> = {
  alta: 'Alta',
  normale: 'Normale',
  bassa: 'Bassa',
};

export interface Employee {
  id: string;
  name: string;
  /** Colore personale del dipendente (usato nel calendario turni), assegnato automaticamente alla creazione. */
  color: string;
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
  /**
   * Fasce orarie preferite (id di fasce del negozio), vincolo soft, in ordine di importanza: la
   * prima (indice 0) è la più importante. Non impostata/vuota = nessuna preferenza.
   */
  preferredCategoryIds?: string[];
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
   * Chiave: id della fascia.
   */
  maxWeeklyShiftsByCategory?: Record<string, number>;
  active: boolean;
  /** Id dell'account collegato a questo dipendente (una volta che si è "identificato" con l'app), se presente. */
  linkedUserId?: string;
  /** Priorità nella generazione automatica dei turni. Non impostata = 'normale'. */
  priority?: EmployeePriority;
}

/** Ruoli che il dipendente può coprire, in ordine di preferenza: principale ed eventuale secondario/di riserva. */
export function employeeRoleIds(employee: Pick<Employee, 'roleId' | 'secondaryRoleId'>): string[] {
  return employee.secondaryRoleId ? [employee.roleId, employee.secondaryRoleId] : [employee.roleId];
}
