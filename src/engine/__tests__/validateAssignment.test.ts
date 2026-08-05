import { Employee, TimeOff, Unavailability } from '@/src/models';
import { AssignmentSlotInfo, validateAssignment } from '../validateAssignment';

const ROLE_COMMESSO = 'role-commesso';
const ROLE_CASSIERE = 'role-cassiere';

function makeEmployee(overrides: Partial<Employee> & Pick<Employee, 'id' | 'name' | 'roleId'>): Employee {
  return {
    weeklyContractHours: 20,
    maxWeeklyHours: 20,
    preference: 'nessuna',
    active: true,
    ...overrides,
  };
}

const SLOT: AssignmentSlotInfo = {
  shiftTemplateId: 'shift-1',
  shiftName: 'Mattina',
  date: '2026-08-03',
  weekday: 1,
  startTime: '09:00',
  endTime: '13:00',
  roleId: ROLE_COMMESSO,
};

describe('validateAssignment', () => {
  it('non restituisce violazioni per un\'assegnazione valida', () => {
    const anna = makeEmployee({ id: 'anna', name: 'Anna', roleId: ROLE_COMMESSO });

    const violations = validateAssignment({
      employee: anna,
      slot: SLOT,
      otherAssignmentsForEmployee: [],
      unavailabilities: [],
      timeOff: [],
    });

    expect(violations).toHaveLength(0);
  });

  it('segnala il ruolo non corrispondente', () => {
    const anna = makeEmployee({ id: 'anna', name: 'Anna', roleId: ROLE_CASSIERE });

    const violations = validateAssignment({
      employee: anna,
      slot: SLOT,
      otherAssignmentsForEmployee: [],
      unavailabilities: [],
      timeOff: [],
    });

    expect(violations.some((v) => v.type === 'role_mismatch' && v.severity === 'hard')).toBe(true);
  });

  it('segnala un conflitto con un\'indisponibilità ricorrente', () => {
    const anna = makeEmployee({ id: 'anna', name: 'Anna', roleId: ROLE_COMMESSO });
    const unavailabilities: Unavailability[] = [
      { id: 'u1', employeeId: 'anna', weekday: 1, startTime: '08:00', endTime: '14:00' },
    ];

    const violations = validateAssignment({
      employee: anna,
      slot: SLOT,
      otherAssignmentsForEmployee: [],
      unavailabilities,
      timeOff: [],
    });

    expect(violations.some((v) => v.type === 'unavailability')).toBe(true);
  });

  it('segnala le ferie nella data del turno', () => {
    const anna = makeEmployee({ id: 'anna', name: 'Anna', roleId: ROLE_COMMESSO });
    const timeOff: TimeOff[] = [{ id: 't1', employeeId: 'anna', date: '2026-08-03' }];

    const violations = validateAssignment({
      employee: anna,
      slot: SLOT,
      otherAssignmentsForEmployee: [],
      unavailabilities: [],
      timeOff,
    });

    expect(violations.some((v) => v.type === 'time_off')).toBe(true);
  });

  it('segnala il superamento delle ore massime settimanali', () => {
    const anna = makeEmployee({ id: 'anna', name: 'Anna', roleId: ROLE_COMMESSO, maxWeeklyHours: 4 });

    const violations = validateAssignment({
      employee: anna,
      slot: SLOT,
      otherAssignmentsForEmployee: [{ date: '2026-08-04', startTime: '09:00', endTime: '13:00' }],
      unavailabilities: [],
      timeOff: [],
    });

    expect(violations.some((v) => v.type === 'max_hours')).toBe(true);
  });

  it('segnala il superamento del numero massimo di turni', () => {
    const anna = makeEmployee({
      id: 'anna',
      name: 'Anna',
      roleId: ROLE_COMMESSO,
      maxWeeklyHours: 100,
      maxWeeklyShifts: 1,
    });

    const violations = validateAssignment({
      employee: anna,
      slot: SLOT,
      otherAssignmentsForEmployee: [{ date: '2026-08-04', startTime: '09:00', endTime: '13:00' }],
      unavailabilities: [],
      timeOff: [],
    });

    expect(violations.some((v) => v.type === 'max_shifts')).toBe(true);
  });

  it('segnala un doppio turno sovrapposto nello stesso giorno', () => {
    const anna = makeEmployee({ id: 'anna', name: 'Anna', roleId: ROLE_COMMESSO, maxWeeklyHours: 100 });

    const violations = validateAssignment({
      employee: anna,
      slot: SLOT,
      otherAssignmentsForEmployee: [{ date: '2026-08-03', startTime: '12:00', endTime: '16:00' }],
      unavailabilities: [],
      timeOff: [],
    });

    expect(violations.some((v) => v.type === 'double_booking')).toBe(true);
  });

  it('segnala come violazione soft una preferenza di fascia oraria non rispettata', () => {
    const anna = makeEmployee({ id: 'anna', name: 'Anna', roleId: ROLE_COMMESSO, preference: 'sera' });

    const violations = validateAssignment({
      employee: anna,
      slot: SLOT, // turno di mattina
      otherAssignmentsForEmployee: [],
      unavailabilities: [],
      timeOff: [],
    });

    const preferenceViolation = violations.find((v) => v.type === 'preference_mismatch');
    expect(preferenceViolation).toBeDefined();
    expect(preferenceViolation?.severity).toBe('soft');
  });
});
