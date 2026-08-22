import { supabase } from '@/src/lib/supabase';
import { ScheduleStatus, ShiftAssignment, WeeklySchedule } from '@/src/models';

interface ScheduleRow {
  id: string;
  week_start_date: string;
  generated_at: string;
  status: ScheduleStatus;
}

interface AssignmentRow {
  id: string;
  schedule_id: string;
  shift_template_id: string;
  date: string;
  employee_id: string;
  role_ids: string[] | null;
  manually_edited: boolean;
}

function mapScheduleRow(row: ScheduleRow): WeeklySchedule {
  return {
    id: row.id,
    weekStartDate: row.week_start_date,
    generatedAt: row.generated_at,
    status: row.status,
  };
}

function mapAssignmentRow(row: AssignmentRow): ShiftAssignment {
  return {
    id: row.id,
    scheduleId: row.schedule_id,
    shiftTemplateId: row.shift_template_id,
    date: row.date,
    employeeId: row.employee_id,
    roleIds: row.role_ids ?? undefined,
    manuallyEdited: row.manually_edited,
  };
}

export async function getScheduleForWeek(weekStartDate: string): Promise<WeeklySchedule | null> {
  const { data, error } = await supabase
    .from('schedules')
    .select('*')
    .eq('week_start_date', weekStartDate)
    .maybeSingle();
  if (error) throw error;
  return data ? mapScheduleRow(data) : null;
}

export async function listAssignmentsForSchedule(scheduleId: string): Promise<ShiftAssignment[]> {
  const { data, error } = await supabase
    .from('shift_assignments')
    .select('*')
    .eq('schedule_id', scheduleId)
    .order('date');
  if (error) throw error;
  return (data ?? []).map(mapAssignmentRow);
}

export interface NewAssignment {
  shiftTemplateId: string;
  date: string;
  employeeId: string;
  roleIds: string[];
}

/**
 * Sostituisce (se esiste) la pianificazione della settimana con una nuova generata
 * automaticamente. Passa tutto a una funzione del database che fa cancellazione e
 * inserimento in un'unica operazione atomica (tutto o niente).
 */
export async function saveGeneratedSchedule(
  weekStartDate: string,
  status: ScheduleStatus,
  assignments: NewAssignment[]
): Promise<WeeklySchedule> {
  const { data: scheduleId, error } = await supabase.rpc('save_generated_schedule', {
    p_week_start_date: weekStartDate,
    p_status: status,
    p_assignments: assignments.map((a) => ({
      shiftTemplateId: a.shiftTemplateId,
      date: a.date,
      employeeId: a.employeeId,
      roleIds: a.roleIds,
    })),
  });
  if (error) throw error;
  return {
    id: scheduleId as string,
    weekStartDate,
    generatedAt: new Date().toISOString(),
    status,
  };
}

/** Riassegna manualmente un turno a un altro dipendente, marcando l'assegnazione come modificata a mano. */
export async function reassignShift(assignmentId: string, employeeId: string): Promise<void> {
  const { error } = await supabase
    .from('shift_assignments')
    .update({ employee_id: employeeId, manually_edited: true })
    .eq('id', assignmentId);
  if (error) throw error;
}

/** Aggiunge manualmente un'assegnazione, es. per coprire un turno che il motore non è riuscito a coprire. */
export async function addManualAssignment(input: {
  scheduleId: string;
  shiftTemplateId: string;
  date: string;
  employeeId: string;
  roleIds: string[];
}): Promise<ShiftAssignment> {
  const { data, error } = await supabase
    .from('shift_assignments')
    .insert({
      schedule_id: input.scheduleId,
      shift_template_id: input.shiftTemplateId,
      date: input.date,
      employee_id: input.employeeId,
      role_ids: input.roleIds,
      manually_edited: true,
    })
    .select()
    .single();
  if (error) throw error;
  return mapAssignmentRow(data);
}

export async function deleteAssignment(assignmentId: string): Promise<void> {
  const { error } = await supabase.from('shift_assignments').delete().eq('id', assignmentId);
  if (error) throw error;
}
