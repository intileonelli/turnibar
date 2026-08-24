import { Role } from '@/src/models';
import { solveSchedule } from './backtracking';
import { preferenceMatches } from './constraints/softConstraints';
import { dateForWeekday } from './dateUtils';
import { buildSolverContext } from './state';
import { EngineInput, GeneratedAssignment, ScheduleResult, Slot, UnresolvedShift } from './types';

function buildSlots(input: EngineInput): Slot[] {
  const slots: Slot[] = [];
  for (const template of input.shiftTemplates) {
    const date = dateForWeekday(input.weekStartDate, template.weekday);
    for (const requirement of template.requirements) {
      for (let unit = 0; unit < requirement.count; unit++) {
        slots.push({
          slotId: `${template.id}-${date}-${requirement.roleIds.join('_')}-${unit}`,
          shiftTemplateId: template.id,
          shiftName: template.name,
          date,
          weekday: template.weekday,
          startTime: template.startTime,
          endTime: template.endTime,
          roleIds: requirement.roleIds,
          categoryId: template.categoryId,
        });
      }
    }
  }
  return slots;
}

function roleNames(roleIds: string[], roles: Role[]): string {
  return roleIds.map((id) => roles.find((r) => r.id === id)?.name ?? id).join(' → ');
}

function buildUnresolvedShifts(unresolvedSlots: Slot[], roles: Role[]): UnresolvedShift[] {
  const grouped = new Map<string, UnresolvedShift>();
  for (const slot of unresolvedSlots) {
    const key = `${slot.shiftTemplateId}-${slot.date}-${slot.roleIds.join('_')}`;
    const existing = grouped.get(key);
    if (existing) {
      existing.missingCount += 1;
    } else {
      grouped.set(key, {
        shiftTemplateId: slot.shiftTemplateId,
        date: slot.date,
        weekday: slot.weekday,
        shiftName: slot.shiftName,
        roleIds: slot.roleIds,
        missingCount: 1,
        reason: `Nessun dipendente disponibile per il ruolo "${roleNames(slot.roleIds, roles)}" rispettando i vincoli (indisponibilità, ferie, ore/turni/giorni massimi).`,
      });
    }
  }
  return [...grouped.values()];
}

/**
 * Genera la pianificazione settimanale rispettando i vincoli hard (indisponibilità, ferie,
 * ore/turni massimi, copertura minima) e ottimizzando i vincoli soft (preferenza fascia oraria,
 * distribuzione equa delle ore, priorità tra ruolo principale e alternative). Se un turno non
 * può essere coperto, viene riportato chiaramente in unresolvedShifts invece di essere omesso
 * silenziosamente.
 */
export function generateSchedule(input: EngineInput, roles: Role[] = []): ScheduleResult {
  const slots = buildSlots(input);
  const activeEmployees = input.employees.filter((e) => e.active);
  const context = buildSolverContext(
    activeEmployees,
    input.shiftTemplates,
    input.unavailabilities,
    input.timeOff,
    input.allowMultipleShiftsPerDay
  );

  const { state, unresolvedSlots } = solveSchedule(slots, activeEmployees, context);

  const assignments: GeneratedAssignment[] = [];
  let softViolationsCount = 0;
  for (const slot of slots) {
    const employeeId = state.assignmentBySlotId.get(slot.slotId);
    if (!employeeId) continue;
    assignments.push({ shiftTemplateId: slot.shiftTemplateId, date: slot.date, employeeId, roleIds: slot.roleIds });

    const employee = activeEmployees.find((e) => e.id === employeeId);
    if (employee && !preferenceMatches(employee, slot)) {
      softViolationsCount += 1;
    }
  }

  return {
    weekStartDate: input.weekStartDate,
    assignments,
    unresolvedShifts: buildUnresolvedShifts(unresolvedSlots, roles),
    softViolationsCount,
  };
}
