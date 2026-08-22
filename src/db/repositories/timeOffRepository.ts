import { supabase } from '@/src/lib/supabase';
import { TimeOff } from '@/src/models';

interface TimeOffRow {
  id: string;
  employee_id: string;
  date: string;
  note: string | null;
}

function mapRow(row: TimeOffRow): TimeOff {
  return {
    id: row.id,
    employeeId: row.employee_id,
    date: row.date,
    note: row.note ?? undefined,
  };
}

export async function listTimeOffForEmployee(employeeId: string): Promise<TimeOff[]> {
  const { data, error } = await supabase
    .from('time_off')
    .select('*')
    .eq('employee_id', employeeId)
    .order('date');
  if (error) throw error;
  return (data ?? []).map(mapRow);
}

export async function listAllTimeOff(): Promise<TimeOff[]> {
  const { data, error } = await supabase.from('time_off').select('*');
  if (error) throw error;
  return (data ?? []).map(mapRow);
}

/** Marca un giorno come ferie per il dipendente. Se già marcato, non fa nulla. */
export async function addTimeOff(employeeId: string, date: string, note?: string): Promise<void> {
  const { error } = await supabase
    .from('time_off')
    .upsert(
      { employee_id: employeeId, date, note: note ?? null },
      { onConflict: 'employee_id,date', ignoreDuplicates: true }
    );
  if (error) throw error;
}

/** Rimuove il giorno di ferie per il dipendente, se presente. */
export async function removeTimeOff(employeeId: string, date: string): Promise<void> {
  const { error } = await supabase
    .from('time_off')
    .delete()
    .eq('employee_id', employeeId)
    .eq('date', date);
  if (error) throw error;
}

/** Inverte lo stato di ferie per un giorno: lo aggiunge se assente, lo rimuove se presente. */
export async function toggleTimeOff(employeeId: string, date: string): Promise<boolean> {
  const { data: existing, error: selectError } = await supabase
    .from('time_off')
    .select('id')
    .eq('employee_id', employeeId)
    .eq('date', date)
    .maybeSingle();
  if (selectError) throw selectError;

  if (existing) {
    const { error } = await supabase.from('time_off').delete().eq('id', existing.id);
    if (error) throw error;
    return false;
  }

  const { error } = await supabase.from('time_off').insert({ employee_id: employeeId, date });
  if (error) throw error;
  return true;
}
