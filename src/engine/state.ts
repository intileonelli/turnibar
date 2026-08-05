import { TimeOff, Unavailability } from '@/src/models';
import { Slot } from './types';

/** Dati precalcolati dall'input, immutabili durante la risoluzione. */
export interface SolverContext {
  unavailabilitiesByEmployee: Map<string, Unavailability[]>;
  timeOffDatesByEmployee: Map<string, Set<string>>;
}

export function buildSolverContext(
  unavailabilities: Unavailability[],
  timeOff: TimeOff[]
): SolverContext {
  const unavailabilitiesByEmployee = new Map<string, Unavailability[]>();
  for (const u of unavailabilities) {
    const list = unavailabilitiesByEmployee.get(u.employeeId) ?? [];
    list.push(u);
    unavailabilitiesByEmployee.set(u.employeeId, list);
  }

  const timeOffDatesByEmployee = new Map<string, Set<string>>();
  for (const t of timeOff) {
    const set = timeOffDatesByEmployee.get(t.employeeId) ?? new Set<string>();
    set.add(t.date);
    timeOffDatesByEmployee.set(t.employeeId, set);
  }

  return { unavailabilitiesByEmployee, timeOffDatesByEmployee };
}

interface TimeRange {
  start: string;
  end: string;
}

/** Stato mutabile della ricerca: ore/turni consumati e assegnazioni correnti per ogni dipendente. */
export class SolverState {
  hoursByEmployee = new Map<string, number>();
  shiftsByEmployee = new Map<string, number>();
  rangesByEmployeeDate = new Map<string, Map<string, TimeRange[]>>();
  assignmentBySlotId = new Map<string, string>();

  getHours(employeeId: string): number {
    return this.hoursByEmployee.get(employeeId) ?? 0;
  }

  getShiftCount(employeeId: string): number {
    return this.shiftsByEmployee.get(employeeId) ?? 0;
  }

  getRangesOn(employeeId: string, date: string): TimeRange[] {
    return this.rangesByEmployeeDate.get(employeeId)?.get(date) ?? [];
  }

  assign(slot: Slot, employeeId: string, durationHours: number): void {
    this.assignmentBySlotId.set(slot.slotId, employeeId);
    this.hoursByEmployee.set(employeeId, this.getHours(employeeId) + durationHours);
    this.shiftsByEmployee.set(employeeId, this.getShiftCount(employeeId) + 1);

    const byDate = this.rangesByEmployeeDate.get(employeeId) ?? new Map<string, TimeRange[]>();
    const ranges = byDate.get(slot.date) ?? [];
    ranges.push({ start: slot.startTime, end: slot.endTime });
    byDate.set(slot.date, ranges);
    this.rangesByEmployeeDate.set(employeeId, byDate);
  }

  unassign(slot: Slot, employeeId: string, durationHours: number): void {
    this.assignmentBySlotId.delete(slot.slotId);
    this.hoursByEmployee.set(employeeId, this.getHours(employeeId) - durationHours);
    this.shiftsByEmployee.set(employeeId, this.getShiftCount(employeeId) - 1);

    const ranges = this.rangesByEmployeeDate.get(employeeId)?.get(slot.date);
    if (ranges) {
      const idx = ranges.findIndex((r) => r.start === slot.startTime && r.end === slot.endTime);
      if (idx !== -1) ranges.splice(idx, 1);
    }
  }
}
