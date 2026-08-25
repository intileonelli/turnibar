import { Employee, TimeOff, Unavailability } from '@/src/models';
import { AssignmentSlotInfo, validateAssignment } from '../validateAssignment';

const ROLE_COMMESSO = 'role-commesso';
const ROLE_CASSIERE = 'role-cassiere';

const CATEGORY_MATTINA = 'cat-mattina';
const CATEGORY_SERA = 'cat-sera';

function makeEmployee(overrides: Partial<Employee> & Pick<Employee, 'id' | 'name' | 'roleId'>): Employee {
  return {
    weeklyContractHours: 20,
    maxWeeklyHours: 20,
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
  roleIds: [ROLE_COMMESSO],
  categoryId: CATEGORY_MATTINA,
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
      allowMultipleShiftsPerDay: true,
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
      allowMultipleShiftsPerDay: true,
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
      allowMultipleShiftsPerDay: true,
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
      allowMultipleShiftsPerDay: true,
    });

    expect(violations.some((v) => v.type === 'time_off')).toBe(true);
  });

  it('segnala il superamento delle ore massime settimanali', () => {
    const anna = makeEmployee({ id: 'anna', name: 'Anna', roleId: ROLE_COMMESSO, maxWeeklyHours: 4 });

    const violations = validateAssignment({
      employee: anna,
      slot: SLOT,
      otherAssignmentsForEmployee: [{ date: '2026-08-04', startTime: '09:00', endTime: '13:00', categoryId: CATEGORY_MATTINA }],
      unavailabilities: [],
      timeOff: [],
      allowMultipleShiftsPerDay: true,
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
      otherAssignmentsForEmployee: [{ date: '2026-08-04', startTime: '09:00', endTime: '13:00', categoryId: CATEGORY_MATTINA }],
      unavailabilities: [],
      timeOff: [],
      allowMultipleShiftsPerDay: true,
    });

    expect(violations.some((v) => v.type === 'max_shifts')).toBe(true);
  });

  it('segnala un doppio turno sovrapposto nello stesso giorno', () => {
    const anna = makeEmployee({ id: 'anna', name: 'Anna', roleId: ROLE_COMMESSO, maxWeeklyHours: 100 });

    const violations = validateAssignment({
      employee: anna,
      slot: SLOT,
      otherAssignmentsForEmployee: [{ date: '2026-08-03', startTime: '12:00', endTime: '16:00', categoryId: CATEGORY_MATTINA }],
      unavailabilities: [],
      timeOff: [],
      allowMultipleShiftsPerDay: true,
    });

    expect(violations.some((v) => v.type === 'double_booking')).toBe(true);
  });

  it('segnala come violazione soft una preferenza di fascia oraria non rispettata', () => {
    const anna = makeEmployee({ id: 'anna', name: 'Anna', roleId: ROLE_COMMESSO, preferredCategoryId: CATEGORY_SERA });

    const violations = validateAssignment({
      employee: anna,
      slot: SLOT, // turno di mattina
      otherAssignmentsForEmployee: [],
      unavailabilities: [],
      timeOff: [],
      allowMultipleShiftsPerDay: true,
    });

    const preferenceViolation = violations.find((v) => v.type === 'preference_mismatch');
    expect(preferenceViolation).toBeDefined();
    expect(preferenceViolation?.severity).toBe('soft');
  });

  it('non segnala nulla sul ruolo quando il dipendente ha il ruolo principale', () => {
    const anna = makeEmployee({ id: 'anna', name: 'Anna', roleId: ROLE_COMMESSO });
    const slotWithFallback = { ...SLOT, roleIds: [ROLE_COMMESSO, ROLE_CASSIERE] };

    const violations = validateAssignment({
      employee: anna,
      slot: slotWithFallback,
      otherAssignmentsForEmployee: [],
      unavailabilities: [],
      timeOff: [],
      allowMultipleShiftsPerDay: true,
    });

    expect(violations.some((v) => v.type === 'role_mismatch')).toBe(false);
  });

  it('segnala come violazione soft l\'uso di un ruolo alternativo (non principale)', () => {
    const carla = makeEmployee({ id: 'carla', name: 'Carla', roleId: ROLE_CASSIERE });
    const slotWithFallback = { ...SLOT, roleIds: [ROLE_COMMESSO, ROLE_CASSIERE] };

    const violations = validateAssignment({
      employee: carla,
      slot: slotWithFallback,
      otherAssignmentsForEmployee: [],
      unavailabilities: [],
      timeOff: [],
      allowMultipleShiftsPerDay: true,
    });

    const roleViolation = violations.find((v) => v.type === 'role_mismatch');
    expect(roleViolation).toBeDefined();
    expect(roleViolation?.severity).toBe('soft');
  });

  it('non segnala ore massime quando il dipendente non ha un limite impostato', () => {
    const anna = makeEmployee({ id: 'anna', name: 'Anna', roleId: ROLE_COMMESSO, maxWeeklyHours: undefined });

    const violations = validateAssignment({
      employee: anna,
      slot: SLOT,
      otherAssignmentsForEmployee: [
        { date: '2026-08-04', startTime: '09:00', endTime: '18:00', categoryId: CATEGORY_MATTINA },
        { date: '2026-08-05', startTime: '09:00', endTime: '18:00', categoryId: CATEGORY_MATTINA },
      ],
      unavailabilities: [],
      timeOff: [],
      allowMultipleShiftsPerDay: true,
    });

    expect(violations.some((v) => v.type === 'max_hours')).toBe(false);
  });

  it('segnala il superamento del numero massimo di giorni lavorativi', () => {
    const anna = makeEmployee({ id: 'anna', name: 'Anna', roleId: ROLE_COMMESSO, maxWeeklyDays: 1 });

    const violations = validateAssignment({
      employee: anna,
      slot: SLOT, // 2026-08-03
      otherAssignmentsForEmployee: [{ date: '2026-08-04', startTime: '09:00', endTime: '13:00', categoryId: CATEGORY_MATTINA }],
      unavailabilities: [],
      timeOff: [],
      allowMultipleShiftsPerDay: true,
    });

    expect(violations.some((v) => v.type === 'max_days')).toBe(true);
  });

  it('non segnala giorni massimi se il turno è nello stesso giorno già lavorato', () => {
    const anna = makeEmployee({ id: 'anna', name: 'Anna', roleId: ROLE_COMMESSO, maxWeeklyDays: 1 });

    const violations = validateAssignment({
      employee: anna,
      slot: SLOT, // 2026-08-03
      otherAssignmentsForEmployee: [{ date: '2026-08-03', startTime: '14:00', endTime: '18:00', categoryId: CATEGORY_MATTINA }],
      unavailabilities: [],
      timeOff: [],
      allowMultipleShiftsPerDay: true,
    });

    expect(violations.some((v) => v.type === 'max_days')).toBe(false);
  });

  it('non segnala il ruolo quando il dipendente copre il turno con il ruolo secondario', () => {
    const bruno = makeEmployee({
      id: 'bruno',
      name: 'Bruno',
      roleId: ROLE_CASSIERE,
      secondaryRoleId: ROLE_COMMESSO,
    });

    const violations = validateAssignment({
      employee: bruno,
      slot: SLOT, // richiede solo ROLE_COMMESSO
      otherAssignmentsForEmployee: [],
      unavailabilities: [],
      timeOff: [],
      allowMultipleShiftsPerDay: true,
    });

    expect(violations.some((v) => v.type === 'role_mismatch' && v.severity === 'hard')).toBe(false);
  });

  it('segnala il superamento del limite di turni per fascia oraria', () => {
    const anna = makeEmployee({
      id: 'anna',
      name: 'Anna',
      roleId: ROLE_COMMESSO,
      maxWeeklyShiftsByCategory: { [CATEGORY_MATTINA]: 1 },
    });

    const violations = validateAssignment({
      employee: anna,
      slot: SLOT, // mattina (09:00)
      otherAssignmentsForEmployee: [{ date: '2026-08-04', startTime: '09:00', endTime: '13:00', categoryId: CATEGORY_MATTINA }],
      unavailabilities: [],
      timeOff: [],
      allowMultipleShiftsPerDay: true,
    });

    expect(violations.some((v) => v.type === 'max_preference_shifts')).toBe(true);
  });

  it('non segnala il limite di fascia se il conteggio riguarda una fascia diversa', () => {
    const anna = makeEmployee({
      id: 'anna',
      name: 'Anna',
      roleId: ROLE_COMMESSO,
      maxWeeklyShiftsByCategory: { [CATEGORY_SERA]: 1 },
    });

    const violations = validateAssignment({
      employee: anna,
      slot: SLOT, // mattina (09:00), il limite impostato è per la sera
      otherAssignmentsForEmployee: [{ date: '2026-08-04', startTime: '09:00', endTime: '13:00', categoryId: CATEGORY_MATTINA }],
      unavailabilities: [],
      timeOff: [],
      allowMultipleShiftsPerDay: true,
    });

    expect(violations.some((v) => v.type === 'max_preference_shifts')).toBe(false);
  });

  it('un permesso segnala time_off solo se il turno si sovrappone alla fascia indicata', () => {
    const anna = makeEmployee({ id: 'anna', name: 'Anna', roleId: ROLE_COMMESSO });
    const permit: TimeOff = { id: 'p1', employeeId: 'anna', date: SLOT.date, startTime: '09:00', endTime: '13:00' };

    const overlapping = validateAssignment({
      employee: anna,
      slot: SLOT, // 09:00-13:00, si sovrappone al permesso
      otherAssignmentsForEmployee: [],
      unavailabilities: [],
      timeOff: [permit],
      allowMultipleShiftsPerDay: true,
    });
    expect(overlapping.some((v) => v.type === 'time_off')).toBe(true);

    const nonOverlapping = validateAssignment({
      employee: anna,
      slot: { ...SLOT, startTime: '18:00', endTime: '22:00' }, // fuori dalla fascia del permesso
      otherAssignmentsForEmployee: [],
      unavailabilities: [],
      timeOff: [permit],
      allowMultipleShiftsPerDay: true,
    });
    expect(nonOverlapping.some((v) => v.type === 'time_off')).toBe(false);
  });
});
