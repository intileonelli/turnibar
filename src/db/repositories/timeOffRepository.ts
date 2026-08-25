import { supabase } from '@/src/lib/supabase';
import { TimeOff } from '@/src/models';

interface TimeOffRow {
  id: string;
  employee_id: string;
  date: string;
  note: string | null;
  start_time: string | null;
  end_time: string | null;
}

function mapRow(row: TimeOffRow): TimeOff {
  return {
    id: row.id,
    employeeId: row.employee_id,
    date: row.date,
    note: row.note ?? undefined,
    startTime: row.start_time ?? undefined,
    endTime: row.end_time ?? undefined,
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

/**
 * Marca un giorno intero come ferie per il dipendente. Sostituisce l'eventuale permesso (fascia
 * oraria) già presente per quel giorno, riportandolo ad assenza per l'intera giornata.
 */
export async function addTimeOff(employeeId: string, date: string, note?: string): Promise<void> {
  const { error } = await supabase
    .from('time_off')
    .upsert(
      { employee_id: employeeId, date, note: note ?? null, start_time: null, end_time: null },
      { onConflict: 'employee_id,date' }
    );
  if (error) throw error;
}

/**
 * Imposta un permesso (assenza limitata a una fascia oraria) per il dipendente in un giorno.
 * Sostituisce l'eventuale ferie/permesso già presente per quel giorno (un solo record per data).
 */
export async function setPermit(
  employeeId: string,
  date: string,
  startTime: string,
  endTime: string,
  note?: string
): Promise<void> {
  const { error } = await supabase
    .from('time_off')
    .upsert(
      { employee_id: employeeId, date, start_time: startTime, end_time: endTime, note: note ?? null },
      { onConflict: 'employee_id,date' }
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
