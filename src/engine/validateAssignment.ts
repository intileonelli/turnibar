import { ConstraintViolation, Employee, employeeRoleIds, TimeOff, Unavailability, Weekday } from '@/src/models';
import { rangesOverlap, shiftDurationHours } from './dateUtils';
import { preferenceMatches } from './constraints/softConstraints';

export interface AssignmentSlotInfo {
  shiftTemplateId: string;
  shiftName: string;
  date: string;
  weekday: Weekday;
  startTime: string;
  endTime: string;
  /** Ruoli accettabili per questo requisito, in ordine di priorità. */
  roleIds: string[];
  /** Fascia oraria (id di una ShiftCategory) del turno tipo di questo slot. */
  categoryId: string;
}

export interface OtherAssignment {
  date: string;
  startTime: string;
  endTime: string;
  categoryId: string;
}

export interface ValidateAssignmentInput {
  employee: Employee;
  slot: AssignmentSlotInfo;
  /** Le altre assegnazioni della stessa settimana per questo dipendente, esclusa quella in modifica. */
  otherAssignmentsForEmployee: OtherAssignment[];
  unavailabilities: Unavailability[];
  timeOff: TimeOff[];
  /** Se un dipendente può avere più di un turno nello stesso giorno (impostazione del negozio). */
  allowMultipleShiftsPerDay: boolean;
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

  if (!employeeRoleIds(employee).some((roleId) => slot.roleIds.includes(roleId))) {
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
  if (employee.maxWeeklyHours !== undefined && otherHours + thisDuration > employee.maxWeeklyHours + 1e-9) {
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

  if (employee.maxWeeklyDays !== undefined) {
    const otherDates = new Set(input.otherAssignmentsForEmployee.map((a) => a.date));
    const isNewDay = !otherDates.has(slot.date);
    if (isNewDay && otherDates.size + 1 > employee.maxWeeklyDays) {
      violations.push({
        ...base,
        type: 'max_days',
        severity: 'hard',
        message: `${employee.name} supererebbe il massimo di ${employee.maxWeeklyDays} giorni lavorativi settimanali.`,
      });
    }
  }

  if (employee.maxWeeklyShiftsByCategory) {
    const limit = employee.maxWeeklyShiftsByCategory[slot.categoryId];
    if (limit !== undefined) {
      const otherCategoryCount = input.otherAssignmentsForEmployee.filter(
        (a) => a.categoryId === slot.categoryId
      ).length;
      if (otherCategoryCount + 1 > limit) {
        violations.push({
          ...base,
          type: 'max_preference_shifts',
          severity: 'hard',
          message: `${employee.name} supererebbe il massimo di ${limit} turni di questa fascia a settimana.`,
        });
      }
    }
  }

  const assignmentsSameDate = input.otherAssignmentsForEmployee.filter((a) => a.date === slot.date);
  if (input.allowMultipleShiftsPerDay) {
    const hasOverlap = assignmentsSameDate.some((a) =>
      rangesOverlap(slot.startTime, slot.endTime, a.startTime, a.endTime)
    );
    if (hasOverlap) {
      violations.push({
        ...base,
        type: 'double_booking',
        severity: 'hard',
        message: `${employee.name} è già assegnato a un turno sovrapposto in questa data.`,
      });
    }
  } else if (assignmentsSameDate.length > 0) {
    violations.push({
      ...base,
      type: 'double_booking',
      severity: 'hard',
      message: `${employee.name} ha già un turno in questa data e l'azienda non permette più turni nello stesso giorno.`,
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

  const primaryIndex = slot.roleIds.indexOf(employee.roleId);
  const secondaryIndex = employee.secondaryRoleId ? slot.roleIds.indexOf(employee.secondaryRoleId) : -1;
  const matchedIndices = [primaryIndex, secondaryIndex].filter((i) => i !== -1);
  const priorityIndex = matchedIndices.length ? Math.min(...matchedIndices) : -1;
  if (priorityIndex > 0) {
    violations.push({
      ...base,
      type: 'role_mismatch',
      severity: 'soft',
      message: `${employee.name} copre questo turno come alternativa (ruolo principale non disponibile).`,
    });
  }

  return violations;
}
