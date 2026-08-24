import { Employee, employeeRoleIds } from '@/src/models';
import { rangesOverlap, shiftDurationHours, shiftPreferenceCategory } from '../dateUtils';
import { SolverContext, SolverState } from '../state';
import { Slot } from '../types';

export type HardConstraintFailure =
  | 'inactive'
  | 'role_mismatch'
  | 'not_pinned_for_day'
  | 'unavailability'
  | 'time_off'
  | 'max_hours'
  | 'max_shifts'
  | 'max_days'
  | 'max_preference_shifts'
  | 'double_booking';

/** Verifica un dipendente candidato contro tutti i vincoli hard per uno slot, nello stato corrente. */
export function findHardConstraintFailure(
  employee: Employee,
  slot: Slot,
  state: SolverState,
  context: SolverContext
): HardConstraintFailure | null {
  if (!employee.active) return 'inactive';
  if (!employeeRoleIds(employee).some((roleId) => slot.roleIds.includes(roleId))) return 'role_mismatch';

  const pinnedForDay = context.pinnedTemplateIdsByEmployeeAndWeekday.get(employee.id)?.get(slot.weekday);
  if (pinnedForDay && !pinnedForDay.has(slot.shiftTemplateId)) {
    // Il dipendente ha uno o più turni fissi in questo giorno della settimana: quel giorno può
    // essere assegnato SOLO a uno di quelli, mai a un turno diverso anche se idoneo.
    return 'not_pinned_for_day';
  }

  const unavailabilities = context.unavailabilitiesByEmployee.get(employee.id) ?? [];
  const hasUnavailabilityConflict = unavailabilities.some(
    (u) => u.weekday === slot.weekday && rangesOverlap(slot.startTime, slot.endTime, u.startTime, u.endTime)
  );
  if (hasUnavailabilityConflict) return 'unavailability';

  const timeOffDates = context.timeOffDatesByEmployee.get(employee.id);
  if (timeOffDates?.has(slot.date)) return 'time_off';

  const duration = shiftDurationHours(slot.startTime, slot.endTime);
  if (
    employee.maxWeeklyHours !== undefined &&
    state.getHours(employee.id) + duration > employee.maxWeeklyHours + 1e-9
  ) {
    return 'max_hours';
  }

  if (
    employee.maxWeeklyShifts !== undefined &&
    state.getShiftCount(employee.id) + 1 > employee.maxWeeklyShifts
  ) {
    return 'max_shifts';
  }

  if (employee.maxWeeklyDays !== undefined) {
    const alreadyWorksThisDate = state.getRangesOn(employee.id, slot.date).length > 0;
    if (!alreadyWorksThisDate && state.getDaysWorked(employee.id) + 1 > employee.maxWeeklyDays) {
      return 'max_days';
    }
  }

  if (employee.maxWeeklyShiftsByPreference) {
    const category = shiftPreferenceCategory(slot.startTime);
    const limit = employee.maxWeeklyShiftsByPreference[category as keyof typeof employee.maxWeeklyShiftsByPreference];
    if (limit !== undefined && state.getCategoryShiftCount(employee.id, category) + 1 > limit) {
      return 'max_preference_shifts';
    }
  }

  const rangesOnDate = state.getRangesOn(employee.id, slot.date);
  if (context.allowMultipleShiftsPerDay) {
    const hasOverlap = rangesOnDate.some((r) =>
      rangesOverlap(slot.startTime, slot.endTime, r.start, r.end)
    );
    if (hasOverlap) return 'double_booking';
  } else if (rangesOnDate.length > 0) {
    // L'azienda non permette più turni nello stesso giorno per lo stesso dipendente, anche se
    // non si sovrappongono: basta che ne abbia già uno quel giorno per escluderlo.
    return 'double_booking';
  }

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
