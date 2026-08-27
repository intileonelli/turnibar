import { supabase } from '@/src/lib/supabase';
import { ShiftDayOverride } from '@/src/models';
import { addDays } from '@/src/utils/date';

interface ShiftDayOverrideRow {
  id: string;
  shift_template_id: string;
  date: string;
  start_time: string | null;
  end_time: string | null;
  hidden: boolean;
}

function mapRow(row: ShiftDayOverrideRow): ShiftDayOverride {
  return {
    id: row.id,
    shiftTemplateId: row.shift_template_id,
    date: row.date,
    startTime: row.start_time ?? undefined,
    endTime: row.end_time ?? undefined,
    hidden: row.hidden,
  };
}

/** Tutte le eccezioni per una settimana (da weekStartDate ai 6 giorni successivi). */
export async function listOverridesForWeek(weekStartDate: string): Promise<ShiftDayOverride[]> {
  const weekEndDate = addDays(weekStartDate, 6);
  const { data, error } = await supabase
    .from('shift_day_overrides')
    .select('*')
    .gte('date', weekStartDate)
    .lte('date', weekEndDate);
  if (error) throw error;
  return (data ?? []).map(mapRow);
}

/** Crea o aggiorna l'eccezione per un turno tipo in una data specifica (orario e/o nascosto). */
export async function upsertOverride(input: {
  shiftTemplateId: string;
  date: string;
  startTime?: string;
  endTime?: string;
  hidden: boolean;
}): Promise<void> {
  const { error } = await supabase
    .from('shift_day_overrides')
    .upsert(
      {
        shift_template_id: input.shiftTemplateId,
        date: input.date,
        start_time: input.startTime ?? null,
        end_time: input.endTime ?? null,
        hidden: input.hidden,
      },
      { onConflict: 'shift_template_id,date' }
    );
  if (error) throw error;
}

/** Rimuove l'eccezione: quel turno torna standard per quella data. */
export async function clearOverride(shiftTemplateId: string, date: string): Promise<void> {
  const { error } = await supabase
    .from('shift_day_overrides')
    .delete()
    .eq('shift_template_id', shiftTemplateId)
    .eq('date', date);
  if (error) throw error;
}

/** Cancella tutte le eccezioni della settimana: chiamato dopo una nuova generazione turni, così le modifiche estemporanee non restano attaccate a una pianificazione appena rifatta da zero. */
export async function clearOverridesForWeek(weekStartDate: string): Promise<void> {
  const weekEndDate = addDays(weekStartDate, 6);
  const { error } = await supabase
    .from('shift_day_overrides')
    .delete()
    .gte('date', weekStartDate)
    .lte('date', weekEndDate);
  if (error) throw error;
}
