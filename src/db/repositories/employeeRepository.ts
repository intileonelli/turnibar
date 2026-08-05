import { getDb } from '@/src/db/client';
import { Employee, ShiftPreference } from '@/src/models';
import { generateId } from '@/src/utils/id';

interface EmployeeRow {
  id: string;
  name: string;
  role_id: string;
  weekly_contract_hours: number;
  max_weekly_hours: number;
  max_weekly_shifts: number | null;
  preference: ShiftPreference;
  active: number;
}

function mapRow(row: EmployeeRow): Employee {
  return {
    id: row.id,
    name: row.name,
    roleId: row.role_id,
    weeklyContractHours: row.weekly_contract_hours,
    maxWeeklyHours: row.max_weekly_hours,
    maxWeeklyShifts: row.max_weekly_shifts ?? undefined,
    preference: row.preference,
    active: row.active === 1,
  };
}

export async function listEmployees(options?: { includeInactive?: boolean }): Promise<Employee[]> {
  const db = await getDb();
  const rows = options?.includeInactive
    ? await db.getAllAsync<EmployeeRow>('SELECT * FROM employees ORDER BY name;')
    : await db.getAllAsync<EmployeeRow>(
        'SELECT * FROM employees WHERE active = 1 ORDER BY name;'
      );
  return rows.map(mapRow);
}

export async function getEmployee(id: string): Promise<Employee | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<EmployeeRow>('SELECT * FROM employees WHERE id = ?;', [id]);
  return row ? mapRow(row) : null;
}

export async function createEmployee(input: Omit<Employee, 'id'>): Promise<Employee> {
  const db = await getDb();
  const id = generateId();
  await db.runAsync(
    `INSERT INTO employees
      (id, name, role_id, weekly_contract_hours, max_weekly_hours, max_weekly_shifts, preference, active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      id,
      input.name,
      input.roleId,
      input.weeklyContractHours,
      input.maxWeeklyHours,
      input.maxWeeklyShifts ?? null,
      input.preference,
      input.active ? 1 : 0,
    ]
  );
  return { id, ...input };
}

export async function updateEmployee(employee: Employee): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE employees SET
      name = ?, role_id = ?, weekly_contract_hours = ?, max_weekly_hours = ?,
      max_weekly_shifts = ?, preference = ?, active = ?
     WHERE id = ?;`,
    [
      employee.name,
      employee.roleId,
      employee.weeklyContractHours,
      employee.maxWeeklyHours,
      employee.maxWeeklyShifts ?? null,
      employee.preference,
      employee.active ? 1 : 0,
      employee.id,
    ]
  );
}

export async function deleteEmployee(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM employees WHERE id = ?;', [id]);
}
