import { Employee, Role, ShiftTemplate, TimeOff, Unavailability } from '@/src/models';
import { generateSchedule } from '../generateSchedule';
import { EngineInput } from '../types';

const ROLE_COMMESSO: Role = { id: 'role-commesso', name: 'Commesso', color: '#000' };
const ROLE_CASSIERE: Role = { id: 'role-cassiere', name: 'Cassiere', color: '#111' };
const ROLES = [ROLE_COMMESSO, ROLE_CASSIERE];

function makeEmployee(overrides: Partial<Employee> & Pick<Employee, 'id' | 'name' | 'roleId'>): Employee {
  return {
    weeklyContractHours: 20,
    maxWeeklyHours: 20,
    preference: 'nessuna',
    active: true,
    ...overrides,
  };
}

const WEEK_START = '2026-08-03'; // trattata come lunedì della settimana nei test

describe('generateSchedule', () => {
  it('copre tutti i turni rispettando i vincoli hard quando possibile', () => {
    const anna = makeEmployee({ id: 'anna', name: 'Anna', roleId: ROLE_COMMESSO.id });
    const bruno = makeEmployee({ id: 'bruno', name: 'Bruno', roleId: ROLE_COMMESSO.id });
    const carla = makeEmployee({ id: 'carla', name: 'Carla', roleId: ROLE_CASSIERE.id });

    const shiftTemplates: ShiftTemplate[] = [
      {
        id: 'shift-mattina',
        weekday: 1,
        name: 'Mattina',
        startTime: '09:00',
        endTime: '13:00',
        requirements: [{ roleId: ROLE_COMMESSO.id, count: 1 }],
      },
      {
        id: 'shift-pomeriggio',
        weekday: 1,
        name: 'Pomeriggio',
        startTime: '13:00',
        endTime: '17:00',
        requirements: [{ roleId: ROLE_CASSIERE.id, count: 1 }],
      },
    ];

    const input: EngineInput = {
      weekStartDate: WEEK_START,
      employees: [anna, bruno, carla],
      shiftTemplates,
      unavailabilities: [],
      timeOff: [],
    };

    const result = generateSchedule(input, ROLES);

    expect(result.assignments).toHaveLength(2);
    expect(result.unresolvedShifts).toHaveLength(0);

    const cassiereAssignment = result.assignments.find((a) => a.shiftTemplateId === 'shift-pomeriggio');
    expect(cassiereAssignment?.employeeId).toBe('carla');
  });

  it('rispetta le indisponibilità ricorrenti: non assegna il dipendente nella fascia bloccata', () => {
    const anna = makeEmployee({ id: 'anna', name: 'Anna', roleId: ROLE_COMMESSO.id });
    const bruno = makeEmployee({ id: 'bruno', name: 'Bruno', roleId: ROLE_COMMESSO.id });

    const unavailabilities: Unavailability[] = [
      { id: 'u1', employeeId: 'anna', weekday: 1, startTime: '09:00', endTime: '13:00' },
    ];

    const shiftTemplates: ShiftTemplate[] = [
      {
        id: 'shift-mattina',
        weekday: 1,
        name: 'Mattina',
        startTime: '09:00',
        endTime: '13:00',
        requirements: [{ roleId: ROLE_COMMESSO.id, count: 1 }],
      },
    ];

    const result = generateSchedule(
      {
        weekStartDate: WEEK_START,
        employees: [anna, bruno],
        shiftTemplates,
        unavailabilities,
        timeOff: [],
      },
      ROLES
    );

    expect(result.assignments).toHaveLength(1);
    expect(result.assignments[0].employeeId).toBe('bruno');
  });

  it('rispetta le ferie: il dipendente in ferie quel giorno non viene assegnato', () => {
    const anna = makeEmployee({ id: 'anna', name: 'Anna', roleId: ROLE_COMMESSO.id });

    const timeOff: TimeOff[] = [{ id: 't1', employeeId: 'anna', date: WEEK_START }];

    const shiftTemplates: ShiftTemplate[] = [
      {
        id: 'shift-mattina',
        weekday: 1,
        name: 'Mattina',
        startTime: '09:00',
        endTime: '13:00',
        requirements: [{ roleId: ROLE_COMMESSO.id, count: 1 }],
      },
    ];

    const result = generateSchedule(
      {
        weekStartDate: WEEK_START,
        employees: [anna],
        shiftTemplates,
        unavailabilities: [],
        timeOff,
      },
      ROLES
    );

    expect(result.assignments).toHaveLength(0);
    expect(result.unresolvedShifts).toHaveLength(1);
    expect(result.unresolvedShifts[0].missingCount).toBe(1);
    expect(result.unresolvedShifts[0].roleId).toBe(ROLE_COMMESSO.id);
  });

  it('segnala chiaramente un turno non copribile invece di ometterlo silenziosamente', () => {
    // Nessun dipendente ha il ruolo "cassiere": il turno deve risultare esplicitamente non coperto.
    const anna = makeEmployee({ id: 'anna', name: 'Anna', roleId: ROLE_COMMESSO.id });

    const shiftTemplates: ShiftTemplate[] = [
      {
        id: 'shift-cassa',
        weekday: 1,
        name: 'Cassa',
        startTime: '09:00',
        endTime: '13:00',
        requirements: [{ roleId: ROLE_CASSIERE.id, count: 2 }],
      },
    ];

    const result = generateSchedule(
      {
        weekStartDate: WEEK_START,
        employees: [anna],
        shiftTemplates,
        unavailabilities: [],
        timeOff: [],
      },
      ROLES
    );

    expect(result.assignments).toHaveLength(0);
    expect(result.unresolvedShifts).toHaveLength(1);
    expect(result.unresolvedShifts[0]).toMatchObject({
      shiftTemplateId: 'shift-cassa',
      roleId: ROLE_CASSIERE.id,
      missingCount: 2,
    });
    expect(result.unresolvedShifts[0].reason.length).toBeGreaterThan(0);
  });

  it('non supera mai il massimo di ore settimanali di un dipendente', () => {
    const anna = makeEmployee({
      id: 'anna',
      name: 'Anna',
      roleId: ROLE_COMMESSO.id,
      maxWeeklyHours: 4,
    });
    const bruno = makeEmployee({
      id: 'bruno',
      name: 'Bruno',
      roleId: ROLE_COMMESSO.id,
      maxWeeklyHours: 20,
    });

    const shiftTemplates: ShiftTemplate[] = [1, 2, 3].map((weekday) => ({
      id: `shift-${weekday}`,
      weekday: weekday as 1 | 2 | 3,
      name: 'Mattina',
      startTime: '09:00',
      endTime: '13:00',
      requirements: [{ roleId: ROLE_COMMESSO.id, count: 1 }],
    }));

    const result = generateSchedule(
      {
        weekStartDate: WEEK_START,
        employees: [anna, bruno],
        shiftTemplates,
        unavailabilities: [],
        timeOff: [],
      },
      ROLES
    );

    const annaHours = result.assignments.filter((a) => a.employeeId === 'anna').length * 4;
    expect(annaHours).toBeLessThanOrEqual(4);
    expect(result.assignments).toHaveLength(3);
    expect(result.unresolvedShifts).toHaveLength(0);
  });

  it('rispetta il numero massimo di turni settimanali', () => {
    const anna = makeEmployee({
      id: 'anna',
      name: 'Anna',
      roleId: ROLE_COMMESSO.id,
      maxWeeklyHours: 100,
      maxWeeklyShifts: 1,
    });
    const bruno = makeEmployee({
      id: 'bruno',
      name: 'Bruno',
      roleId: ROLE_COMMESSO.id,
      maxWeeklyHours: 100,
    });

    const shiftTemplates: ShiftTemplate[] = [1, 2].map((weekday) => ({
      id: `shift-${weekday}`,
      weekday: weekday as 1 | 2,
      name: 'Mattina',
      startTime: '09:00',
      endTime: '13:00',
      requirements: [{ roleId: ROLE_COMMESSO.id, count: 1 }],
    }));

    const result = generateSchedule(
      {
        weekStartDate: WEEK_START,
        employees: [anna, bruno],
        shiftTemplates,
        unavailabilities: [],
        timeOff: [],
      },
      ROLES
    );

    const annaShiftCount = result.assignments.filter((a) => a.employeeId === 'anna').length;
    expect(annaShiftCount).toBeLessThanOrEqual(1);
    expect(result.assignments).toHaveLength(2);
  });

  it('non assegna mai lo stesso dipendente a due turni sovrapposti nello stesso giorno', () => {
    const anna = makeEmployee({
      id: 'anna',
      name: 'Anna',
      roleId: ROLE_COMMESSO.id,
      maxWeeklyHours: 100,
    });

    const shiftTemplates: ShiftTemplate[] = [
      {
        id: 'shift-a',
        weekday: 1,
        name: 'Turno A',
        startTime: '09:00',
        endTime: '14:00',
        requirements: [{ roleId: ROLE_COMMESSO.id, count: 1 }],
      },
      {
        id: 'shift-b',
        weekday: 1,
        name: 'Turno B',
        startTime: '13:00',
        endTime: '17:00',
        requirements: [{ roleId: ROLE_COMMESSO.id, count: 1 }],
      },
    ];

    const result = generateSchedule(
      {
        weekStartDate: WEEK_START,
        employees: [anna],
        shiftTemplates,
        unavailabilities: [],
        timeOff: [],
      },
      ROLES
    );

    // Anna può coprire al massimo uno dei due turni sovrapposti; l'altro resta scoperto.
    expect(result.assignments).toHaveLength(1);
    expect(result.unresolvedShifts).toHaveLength(1);
  });

  it('preferisce il candidato la cui preferenza di fascia oraria corrisponde al turno', () => {
    const anna = makeEmployee({
      id: 'anna',
      name: 'Anna',
      roleId: ROLE_COMMESSO.id,
      preference: 'sera',
    });
    const bruno = makeEmployee({
      id: 'bruno',
      name: 'Bruno',
      roleId: ROLE_COMMESSO.id,
      preference: 'mattina',
    });

    const shiftTemplates: ShiftTemplate[] = [
      {
        id: 'shift-mattina',
        weekday: 1,
        name: 'Mattina',
        startTime: '09:00',
        endTime: '13:00',
        requirements: [{ roleId: ROLE_COMMESSO.id, count: 1 }],
      },
    ];

    const result = generateSchedule(
      {
        weekStartDate: WEEK_START,
        employees: [anna, bruno],
        shiftTemplates,
        unavailabilities: [],
        timeOff: [],
      },
      ROLES
    );

    expect(result.assignments[0].employeeId).toBe('bruno');
  });

  it('distribuisce le ore in modo proporzionale alle ore contrattuali (part-time vs full-time)', () => {
    const partTime = makeEmployee({
      id: 'part',
      name: 'Part Time',
      roleId: ROLE_COMMESSO.id,
      weeklyContractHours: 10,
      maxWeeklyHours: 10,
    });
    const fullTime = makeEmployee({
      id: 'full',
      name: 'Full Time',
      roleId: ROLE_COMMESSO.id,
      weeklyContractHours: 30,
      maxWeeklyHours: 30,
    });

    // 5 turni da 4 ore ciascuno: capacità totale disponibile 40h, domanda 20h.
    const shiftTemplates: ShiftTemplate[] = [1, 2, 3, 4, 5].map((weekday) => ({
      id: `shift-${weekday}`,
      weekday: weekday as 1 | 2 | 3 | 4 | 5,
      name: 'Mattina',
      startTime: '09:00',
      endTime: '13:00',
      requirements: [{ roleId: ROLE_COMMESSO.id, count: 1 }],
    }));

    const result = generateSchedule(
      {
        weekStartDate: WEEK_START,
        employees: [partTime, fullTime],
        shiftTemplates,
        unavailabilities: [],
        timeOff: [],
      },
      ROLES
    );

    const partHours = result.assignments.filter((a) => a.employeeId === 'part').length * 4;
    const fullHours = result.assignments.filter((a) => a.employeeId === 'full').length * 4;

    // Il full-time (30h contrattuali) deve ricevere più ore assolute del part-time (10h contrattuali).
    expect(fullHours).toBeGreaterThan(partHours);
    expect(result.unresolvedShifts).toHaveLength(0);
  });
});
