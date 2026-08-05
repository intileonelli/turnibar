import { ConstraintViolation, Employee, TimeOff, Unavailability, Weekday } from '@/src/models';
import { rangesOverlap, shiftDurationHours } from './dateUtils';
import { preferenceMatches } from './constraints/softConstraints';

export interface AssignmentSlotInfo {
  shiftTemplateId: string;
  shiftName: string;
  date: string;
  weekday: Weekday;
  startTime: string;
  endTime: string;
  roleId: string;
}

export interface OtherAssignment {
  date: string;
  startTime: string;
  endTime: string;
}

export interface ValidateAssignmentInput {
  employee: Employee;
  slot: AssignmentSlotInfo;
  /** Le altre assegnazioni della stessa settimana per questo dipendente, esclusa quella in modifica. */
  otherAssignmentsForEmployee: OtherAssignment[];
  unavailabilities: Unavailability[];
  timeOff: TimeOff[];
}

/**
 * Verifica una singola assegnazione (tipicamente dopo una modifica manuale) contro tutti i vincoli,
 * hard e soft, e restituisce l'elenco delle violazioni da mostrare in UI. Non blocca il salvataggio:
 * l'utente resta libero di forzare un'assegnazione, ma la vede evidenziata chiaramente.
 */
export function validateAssignment(input: ValidateAssignmentInput): ConstraintViolation[] {
  const { employee, slot } = input;
  const violations: ConstraintViolation[] = [];
  const base = { employeeId: employee.id, shiftTemplateId: slot.shiftTemplateId, date: slot.date };

  if (employee.roleId !== slot.roleId) {
    violations.push({
      ...base,
      type: 'role_mismatch',
      severity: 'hard',
      message: `${employee.name} non ha il ruolo richiesto per il turno "${slot.shiftName}".`,
    });
  }

  const hasUnavailabilityConflict = input.unavailabilities.some(
    (u) =>
      u.employeeId === employee.id &&
      u.weekday === slot.weekday &&
      rangesOverlap(slot.startTime, slot.endTime, u.startTime, u.endTime)
  );
  if (hasUnavailabilityConflict) {
    violations.push({
      ...base,
      type: 'unavailability',
      severity: 'hard',
      message: `${employee.name} ha indicato di non essere disponibile in questa fascia oraria.`,
    });
  }

  const hasTimeOff = input.timeOff.some((t) => t.employeeId === employee.id && t.date === slot.date);
  if (hasTimeOff) {
    violations.push({
      ...base,
      type: 'time_off',
      severity: 'hard',
      message: `${employee.name} è in ferie/permesso in questa data.`,
    });
  }

  const otherHours = input.otherAssignmentsForEmployee.reduce(
    (sum, a) => sum + shiftDurationHours(a.startTime, a.endTime),
    0
  );
  const thisDuration = shiftDurationHours(slot.startTime, slot.endTime);
  if (otherHours + thisDuration > employee.maxWeeklyHours + 1e-9) {
    violations.push({
      ...base,
      type: 'max_hours',
      severity: 'hard',
      message: `${employee.name} supererebbe il massimo di ${employee.maxWeeklyHours} ore settimanali.`,
    });
  }

  if (
    employee.maxWeeklyShifts !== undefined &&
    input.otherAssignmentsForEmployee.length + 1 > employee.maxWeeklyShifts
  ) {
    violations.push({
      ...base,
      type: 'max_shifts',
      severity: 'hard',
      message: `${employee.name} supererebbe il massimo di ${employee.maxWeeklyShifts} turni settimanali.`,
    });
  }

  const hasDoubleBooking = input.otherAssignmentsForEmployee.some(
    (a) => a.date === slot.date && rangesOverlap(slot.startTime, slot.endTime, a.startTime, a.endTime)
  );
  if (hasDoubleBooking) {
    violations.push({
      ...base,
      type: 'double_booking',
      severity: 'hard',
      message: `${employee.name} è già assegnato a un turno sovrapposto in questa data.`,
    });
  }

  if (!preferenceMatches(employee, slot)) {
    violations.push({
      ...base,
      type: 'preference_mismatch',
      severity: 'soft',
      message: `Questo turno non rispetta la preferenza di fascia oraria di ${employee.name}.`,
    });
  }

  return violations;
}
