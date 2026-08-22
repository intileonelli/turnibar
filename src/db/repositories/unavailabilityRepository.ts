import { supabase } from '@/src/lib/supabase';
import { Unavailability, Weekday } from '@/src/models';

interface UnavailabilityRow {
  id: string;
  employee_id: string;
  weekday: Weekday;
  start_time: string;
  end_time: string;
  note: string | null;
}

function mapRow(row: UnavailabilityRow): Unavailability {
  return {
    id: row.id,
    employeeId: row.employee_id,
    weekday: row.weekday,
    startTime: row.start_time,
    endTime: row.end_time,
    note: row.note ?? undefined,
  };
}

export async function listUnavailabilitiesForEmployee(employeeId: string): Promise<Unavailability[]> {
  const { data, error } = await supabase
    .from('unavailabilities')
    .select('*')
    .eq('employee_id', employeeId)
    .order('weekday')
    .order('start_time');
  if (error) throw error;
  return (data ?? []).map(mapRow);
}

export async function listAllUnavailabilities(): Promise<Unavailability[]> {
  const { data, error } = await supabase.from('unavailabilities').select('*');
  if (error) throw error;
  return (data ?? []).map(mapRow);
}

export async function createUnavailability(
  input: Omit<Unavailability, 'id'>
): Promise<Unavailability> {
  const { data, error } = await supabase
    .from('unavailabilities')
    .insert({
      employee_id: input.employeeId,
      weekday: input.weekday,
      start_time: input.startTime,
      end_time: input.endTime,
      note: input.note ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return mapRow(data);
}

export async function deleteUnavailability(id: string): Promise<void> {
  const { error } = await supabase.from('unavailabilities').delete().eq('id', id);
  if (error) throw error;
}
