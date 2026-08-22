import { supabase } from '@/src/lib/supabase';
import { Employee, ShiftPreference, Weekday } from '@/src/models';

interface EmployeeRow {
  id: string;
  name: string;
  role_id: string;
  secondary_role_id: string | null;
  weekly_contract_hours: number | null;
  max_weekly_hours: number | null;
  max_weekly_shifts: number | null;
  max_weekly_days: number | null;
  preferred_weekdays: number[] | null;
  preference: ShiftPreference;
  pinned_shift_template_ids: string[] | null;
  max_weekly_shifts_by_preference: Employee['maxWeeklyShiftsByPreference'] | null;
  active: boolean;
  user_id: string | null;
}

function mapRow(row: EmployeeRow): Employee {
  return {
    id: row.id,
    name: row.name,
    roleId: row.role_id,
    secondaryRoleId: row.secondary_role_id ?? undefined,
    weeklyContractHours: row.weekly_contract_hours ?? undefined,
    maxWeeklyHours: row.max_weekly_hours ?? undefined,
    maxWeeklyShifts: row.max_weekly_shifts ?? undefined,
    maxWeeklyDays: row.max_weekly_days ?? undefined,
    preferredWeekdays: row.preferred_weekdays?.length ? (row.preferred_weekdays as Weekday[]) : undefined,
    preference: row.preference,
    pinnedShiftTemplateIds: row.pinned_shift_template_ids?.length
      ? row.pinned_shift_template_ids
      : undefined,
    maxWeeklyShiftsByPreference: row.max_weekly_shifts_by_preference ?? undefined,
    active: row.active,
    linkedUserId: row.user_id ?? undefined,
  };
}

function toRow(input: Omit<Employee, 'id'>) {
  return {
    name: input.name,
    role_id: input.roleId,
    secondary_role_id: input.secondaryRoleId ?? null,
    weekly_contract_hours: input.weeklyContractHours ?? null,
    max_weekly_hours: input.maxWeeklyHours ?? null,
    max_weekly_shifts: input.maxWeeklyShifts ?? null,
    max_weekly_days: input.maxWeeklyDays ?? null,
    preferred_weekdays: input.preferredWeekdays?.length ? input.preferredWeekdays : null,
    preference: input.preference,
    pinned_shift_template_ids: input.pinnedShiftTemplateIds?.length
      ? input.pinnedShiftTemplateIds
      : null,
    max_weekly_shifts_by_preference:
      input.maxWeeklyShiftsByPreference && Object.keys(input.maxWeeklyShiftsByPreference).length
        ? input.maxWeeklyShiftsByPreference
        : null,
    active: input.active,
    user_id: input.linkedUserId ?? null,
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

export async function createEmployee(input: Omit<Employee, 'id'>): Promise<Employee> {
  const { data, error } = await supabase.from('employees').insert(toRow(input)).select().single();
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
