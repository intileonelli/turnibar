export type ViolationType =
  | 'unavailability'
  | 'time_off'
  | 'max_hours'
  | 'max_shifts'
  | 'coverage_missing'
  | 'double_booking'
  | 'role_mismatch'
  | 'preference_mismatch';

export type ViolationSeverity = 'hard' | 'soft';

/** Violazione di un vincolo, generata sia dal motore di generazione sia dalla validazione di modifiche manuali. */
export interface ConstraintViolation {
  type: ViolationType;
  severity: ViolationSeverity;
  /** Messaggio leggibile in italiano da mostrare in UI. */
  message: string;
  employeeId?: string;
  shiftTemplateId?: string;
  /** Data in formato "YYYY-MM-DD". */
  date?: string;
}
