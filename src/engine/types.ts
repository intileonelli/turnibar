import { Employee, ShiftTemplate, TimeOff, Unavailability, Weekday } from '@/src/models';

export interface EngineInput {
  /** Lunedì della settimana da generare, formato "YYYY-MM-DD". */
  weekStartDate: string;
  employees: Employee[];
  /** Tutti i turni tipo del negozio; il motore seleziona quelli del giorno della settimana giusto. */
  shiftTemplates: ShiftTemplate[];
  unavailabilities: Unavailability[];
  timeOff: TimeOff[];
}

export interface GeneratedAssignment {
  shiftTemplateId: string;
  date: string;
  employeeId: string;
  /** Ruoli del requisito specifico riempito da questa assegnazione, in ordine di priorità. */
  roleIds: string[];
}

export interface UnresolvedShift {
  shiftTemplateId: string;
  date: string;
  weekday: Weekday;
  shiftName: string;
  /** Ruoli accettabili per questo requisito, in ordine di priorità. */
  roleIds: string[];
  missingCount: number;
  reason: string;
}

export interface ScheduleResult {
  weekStartDate: string;
  assignments: GeneratedAssignment[];
  unresolvedShifts: UnresolvedShift[];
  /** Violazioni soft residue (es. preferenza fascia oraria non rispettata), per trasparenza. */
  softViolationsCount: number;
}

/** Una singola "unità" da coprire: un turno tipo in una data, un posto alla volta. */
export interface Slot {
  slotId: string;
  shiftTemplateId: string;
  shiftName: string;
  date: string;
  weekday: Weekday;
  startTime: string;
  endTime: string;
  /** Ruoli accettabili per questo slot, in ordine di priorità (il primo è quello preferito). */
  roleIds: string[];
}
