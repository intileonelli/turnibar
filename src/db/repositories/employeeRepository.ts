import { supabase } from '@/src/lib/supabase';
import { Employee, EmployeePriority, Weekday } from '@/src/models';
import { EMPLOYEE_COLOR_PALETTE } from '@/src/constants/employeeColors';

interface EmployeeRow {
  id: string;
  name: string;
  color: string;
  role_id: string;
  secondary_role_id: string | null;
  weekly_contract_hours: number | null;
  max_weekly_hours: number | null;
  max_weekly_shifts: number | null;
  max_weekly_days: number | null;
  preferred_weekdays: number[] | null;
  preferred_category_id: string | null;
  pinned_shift_template_ids: string[] | null;
  max_weekly_shifts_by_preference: Employee['maxWeeklyShiftsByCategory'] | null;
  active: boolean;
  user_id: string | null;
  priority: EmployeePriority | null;
}

function mapRow(row: EmployeeRow): Employee {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    roleId: row.role_id,
    secondaryRoleId: row.secondary_role_id ?? undefined,
    weeklyContractHours: row.weekly_contract_hours ?? undefined,
    maxWeeklyHours: row.max_weekly_hours ?? undefined,
    maxWeeklyShifts: row.max_weekly_shifts ?? undefined,
    maxWeeklyDays: row.max_weekly_days ?? undefined,
    preferredWeekdays: row.preferred_weekdays?.length ? (row.preferred_weekdays as Weekday[]) : undefined,
    preferredCategoryId: row.preferred_category_id ?? undefined,
    pinnedShiftTemplateIds: row.pinned_shift_template_ids?.length
      ? row.pinned_shift_template_ids
      : undefined,
    maxWeeklyShiftsByCategory: row.max_weekly_shifts_by_preference ?? undefined,
    active: row.active,
    linkedUserId: row.user_id ?? undefined,
    priority: row.priority ?? undefined,
  };
}

function toRow(input: Omit<Employee, 'id'>) {
  return {
    name: input.name,
    color: input.color,
    role_id: input.roleId,
    secondary_role_id: input.secondaryRoleId ?? null,
    weekly_contract_hours: input.weeklyContractHours ?? null,
    max_weekly_hours: input.maxWeeklyHours ?? null,
    max_weekly_shifts: input.maxWeeklyShifts ?? null,
    max_weekly_days: input.maxWeeklyDays ?? null,
    preferred_weekdays: input.preferredWeekdays?.length ? input.preferredWeekdays : null,
    preferred_category_id: input.preferredCategoryId ?? null,
    pinned_shift_template_ids: input.pinnedShiftTemplateIds?.length
      ? input.pinnedShiftTemplateIds
      : null,
    max_weekly_shifts_by_preference:
      input.maxWeeklyShiftsByCategory && Object.keys(input.maxWeeklyShiftsByCategory).length
        ? input.maxWeeklyShiftsByCategory
        : null,
    active: input.active,
    user_id: input.linkedUserId ?? null,
    priority: input.priority ?? null,
  };
}

export async function listEmployees(options?: { includeInactive?: boolean }): Promise<Employee[]> {
  const query = supabase.from('employees').select('*').order('name');
  const { data, error } = options?.includeInactive ? await query : await query.eq('active', true);
  if (error) throw error;
  return (data ?? []).map(mapRow);
}

export async function getEmployee(id: string): Promise<Employee | null> {
  const { data, error } = await supabase.from('employees').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? mapRow(data) : null;
}

/** Il colore è assegnato automaticamente dal sistema (ciclando sulla palette), non scelto dall'utente. */
export async function createEmployee(input: Omit<Employee, 'id' | 'color'>): Promise<Employee> {
  const { count } = await supabase.from('employees').select('id', { count: 'exact', head: true });
  const color = EMPLOYEE_COLOR_PALETTE[(count ?? 0) % EMPLOYEE_COLOR_PALETTE.length];
  const { data, error } = await supabase
    .from('employees')
    .insert(toRow({ ...input, color }))
    .select()
    .single();
  if (error) throw error;
  return mapRow(data);
}

export async function updateEmployee(employee: Employee): Promise<void> {
  const { error } = await supabase.from('employees').update(toRow(employee)).eq('id', employee.id);
  if (error) throw error;
}

export async function deleteEmployee(id: string): Promise<void> {
  const { error } = await supabase.from('employees').delete().eq('id', id);
  if (error) throw error;
}
