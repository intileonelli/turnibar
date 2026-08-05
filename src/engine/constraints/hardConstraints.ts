import { Employee } from '@/src/models';
import { rangesOverlap, shiftDurationHours } from '../dateUtils';
import { SolverContext, SolverState } from '../state';
import { Slot } from '../types';

export type HardConstraintFailure =
  | 'inactive'
  | 'role_mismatch'
  | 'unavailability'
  | 'time_off'
  | 'max_hours'
  | 'max_shifts'
  | 'double_booking';

/** Verifica un dipendente candidato contro tutti i vincoli hard per uno slot, nello stato corrente. */
export function findHardConstraintFailure(
  employee: Employee,
  slot: Slot,
  state: SolverState,
  context: SolverContext
): HardConstraintFailure | null {
  if (!employee.active) return 'inactive';
  if (employee.roleId !== slot.roleId) return 'role_mismatch';

  const unavailabilities = context.unavailabilitiesByEmployee.get(employee.id) ?? [];
  const hasUnavailabilityConflict = unavailabilities.some(
    (u) => u.weekday === slot.weekday && rangesOverlap(slot.startTime, slot.endTime, u.startTime, u.endTime)
  );
  if (hasUnavailabilityConflict) return 'unavailability';

  const timeOffDates = context.timeOffDatesByEmployee.get(employee.id);
  if (timeOffDates?.has(slot.date)) return 'time_off';

  const duration = shiftDurationHours(slot.startTime, slot.endTime);
  if (state.getHours(employee.id) + duration > employee.maxWeeklyHours + 1e-9) return 'max_hours';

  if (
    employee.maxWeeklyShifts !== undefined &&
    state.getShiftCount(employee.id) + 1 > employee.maxWeeklyShifts
  ) {
    return 'max_shifts';
  }

  const rangesOnDate = state.getRangesOn(employee.id, slot.date);
  const hasDoubleBooking = rangesOnDate.some((r) =>
    rangesOverlap(slot.startTime, slot.endTime, r.start, r.end)
  );
  if (hasDoubleBooking) return 'double_booking';

  return null;
}

export function isEligible(
  employee: Employee,
  slot: Slot,
  state: SolverState,
  context: SolverContext
): boolean {
  return findHardConstraintFailure(employee, slot, state, context) === null;
}

export function getEligibleCandidates(
  employees: Employee[],
  slot: Slot,
  state: SolverState,
  context: SolverContext
): Employee[] {
  return employees.filter((e) => isEligible(e, slot, state, context));
}
