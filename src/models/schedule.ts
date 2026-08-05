export type ScheduleStatus = 'complete' | 'incomplete';

/** Pianificazione generata per una settimana specifica. */
export interface WeeklySchedule {
  id: string;
  /** Lunedì della settimana, formato "YYYY-MM-DD". */
  weekStartDate: string;
  generatedAt: string;
  /** "incomplete" se almeno un turno non è stato coperto rispettando i vincoli hard. */
  status: ScheduleStatus;
}

/** Assegnazione di un dipendente a un turno tipo in una data specifica. */
export interface ShiftAssignment {
  id: string;
  scheduleId: string;
  shiftTemplateId: string;
  /** Data in formato "YYYY-MM-DD". */
  date: string;
  employeeId: string;
  /** True se l'assegnazione è stata modificata a mano dopo la generazione automatica. */
  manuallyEdited: boolean;
}
