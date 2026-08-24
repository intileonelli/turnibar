import { getDb } from '@/src/db/local/client';
import { LegacyEmployee, LegacyShiftPreference } from '@/src/db/local/legacyModels';
import { Weekday } from '@/src/models';
import { generateId } from '@/src/utils/id';

interface EmployeeRow {
  id: string;
  name: string;
  role_id: string;
  secondary_role_id: string | null;
  weekly_contract_hours: number | null;
  max_weekly_hours: number | null;
  max_weekly_shifts: number | null;
  max_weekly_days: number | null;
  preferred_weekdays: string | null;
  preference: LegacyShiftPreference;
  pinned_shift_template_ids: string | null;
  max_weekly_shifts_by_preference: string | null;
  active: number;
}

function mapRow(row: EmployeeRow): LegacyEmployee {
  return {
    id: row.id,
    name: row.name,
    roleId: row.role_id,
    secondaryRoleId: row.secondary_role_id ?? undefined,
    weeklyContractHours: row.weekly_contract_hours ?? undefined,
    maxWeeklyHours: row.max_weekly_hours ?? undefined,
    maxWeeklyShifts: row.max_weekly_shifts ?? undefined,
    maxWeeklyDays: row.max_weekly_days ?? undefined,
    preferredWeekdays: row.preferred_weekdays
      ? (row.preferred_weekdays.split(',').map(Number) as Weekday[])
      : undefined,
    preference: row.preference,
    pinnedShiftTemplateIds: row.pinned_shift_template_ids
      ? row.pinned_shift_template_ids.split(',')
      : undefined,
    maxWeeklyShiftsByPreference: row.max_weekly_shifts_by_preference
      ? JSON.parse(row.max_weekly_shifts_by_preference)
      : undefined,
    active: row.active === 1,
  };
}

export async function listEmployees(options?: { includeInactive?: boolean }): Promise<LegacyEmployee[]> {
  const db = await getDb();
  const rows = options?.includeInactive
    ? await db.getAllAsync<EmployeeRow>('SELECT * FROM employees ORDER BY name;')
    : await db.getAllAsync<EmployeeRow>(
        'SELECT * FROM employees WHERE active = 1 ORDER BY name;'
      );
  return rows.map(mapRow);
}

export async function getEmployee(id: string): Promise<LegacyEmployee | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<EmployeeRow>('SELECT * FROM employees WHERE id = ?;', [id]);
  return row ? mapRow(row) : null;
}

export async function createEmployee(input: Omit<LegacyEmployee, 'id'>): Promise<LegacyEmployee> {
  const db = await getDb();
  const id = generateId();
  await db.runAsync(
    `INSERT INTO employees
      (id, name, role_id, secondary_role_id, weekly_contract_hours, max_weekly_hours,
       max_weekly_shifts, max_weekly_days, preferred_weekdays, preference,
       pinned_shift_template_ids, max_weekly_shifts_by_preference, active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      id,
      input.name,
      input.roleId,
      input.secondaryRoleId ?? null,
      input.weeklyContractHours ?? null,
      input.maxWeeklyHours ?? null,
      input.maxWeeklyShifts ?? null,
      input.maxWeeklyDays ?? null,
      input.preferredWeekdays?.length ? input.preferredWeekdays.join(',') : null,
      input.preference,
      input.pinnedShiftTemplateIds?.length ? input.pinnedShiftTemplateIds.join(',') : null,
      input.maxWeeklyShiftsByPreference && Object.keys(input.maxWeeklyShiftsByPreference).length
        ? JSON.stringify(input.maxWeeklyShiftsByPreference)
        : null,
      input.active ? 1 : 0,
    ]
  );
  return { id, ...input };
}

export async function updateEmployee(employee: LegacyEmployee): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE employees SET
      name = ?, role_id = ?, secondary_role_id = ?, weekly_contract_hours = ?, max_weekly_hours = ?,
      max_weekly_shifts = ?, max_weekly_days = ?, preferred_weekdays = ?, preference = ?,
      pinned_shift_template_ids = ?, max_weekly_shifts_by_preference = ?, active = ?
     WHERE id = ?;`,
    [
      employee.name,
      employee.roleId,
      employee.secondaryRoleId ?? null,
      employee.weeklyContractHours ?? null,
      employee.maxWeeklyHours ?? null,
      employee.maxWeeklyShifts ?? null,
      employee.maxWeeklyDays ?? null,
      employee.preferredWeekdays?.length ? employee.preferredWeekdays.join(',') : null,
      employee.preference,
      employee.pinnedShiftTemplateIds?.length ? employee.pinnedShiftTemplateIds.join(',') : null,
      employee.maxWeeklyShiftsByPreference && Object.keys(employee.maxWeeklyShiftsByPreference).length
        ? JSON.stringify(employee.maxWeeklyShiftsByPreference)
        : null,
      employee.active ? 1 : 0,
      employee.id,
    ]
  );
}

export async function deleteEmployee(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM employees WHERE id = ?;', [id]);
}
