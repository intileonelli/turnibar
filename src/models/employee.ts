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
  /** Ore contrattuali settimanali, usate come riferimento per la distribuzione equa delle ore. */
  weeklyContractHours: number;
  /** Tetto massimo di ore assegnabili in una settimana (vincolo hard). */
  maxWeeklyHours: number;
  /** Numero massimo di turni assegnabili in una settimana (vincolo hard), opzionale. */
  maxWeeklyShifts?: number;
  /** Preferenza di fascia oraria, vincolo soft. */
  preference: ShiftPreference;
  active: boolean;
}
