import { RoleRequirement, Weekday } from '@/src/models';

/**
 * Forma dei dati come erano salvati nel vecchio database locale (prima che le fasce orarie
 * diventassero personalizzabili per azienda): usata solo dallo strumento di importazione una
 * tantum, per poter tradurre i vecchi valori fissi ("mattina"/"pomeriggio"/"sera") nelle nuove
 * fasce dell'azienda al momento della copia sul cloud.
 */
export type LegacyShiftPreference = 'mattina' | 'pomeriggio' | 'sera' | 'nessuna';

export interface LegacyEmployee {
  id: string;
  name: string;
  roleId: string;
  secondaryRoleId?: string;
  weeklyContractHours?: number;
  maxWeeklyHours?: number;
  maxWeeklyShifts?: number;
  maxWeeklyDays?: number;
  preferredWeekdays?: Weekday[];
  preference: LegacyShiftPreference;
  pinnedShiftTemplateIds?: string[];
  maxWeeklyShiftsByPreference?: Partial<Record<Exclude<LegacyShiftPreference, 'nessuna'>, number>>;
  active: boolean;
}

export interface LegacyShiftTemplate {
  id: string;
  weekday: Weekday;
  name: string;
  startTime: string;
  endTime: string;
  requirements: RoleRequirement[];
}
