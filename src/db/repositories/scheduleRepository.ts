import { getDb } from '@/src/db/client';
import { ScheduleStatus, ShiftAssignment, WeeklySchedule } from '@/src/models';
import { generateId } from '@/src/utils/id';

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
  role_ids: string | null;
  manually_edited: number;
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
    roleIds: row.role_ids ? row.role_ids.split(',') : undefined,
    manuallyEdited: row.manually_edited === 1,
  };
}

export async function getScheduleForWeek(weekStartDate: string): Promise<WeeklySchedule | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<ScheduleRow>(
    'SELECT * FROM schedules WHERE week_start_date = ?;',
    [weekStartDate]
  );
  return row ? mapScheduleRow(row) : null;
}

export async function listAssignmentsForSchedule(scheduleId: string): Promise<ShiftAssignment[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<AssignmentRow>(
    'SELECT * FROM shift_assignments WHERE schedule_id = ? ORDER BY date;',
    [scheduleId]
  );
  return rows.map(mapAssignmentRow);
}

export interface NewAssignment {
  shiftTemplateId: string;
  date: string;
  employeeId: string;
  roleIds: string[];
}

/**
 * Sostituisce (se esiste) la pianificazione della settimana con una nuova generata automaticamente.
 * Operazione transazionale: cancella lo schedule precedente (le assegnazioni collegate vengono
 * rimosse in cascata) e inserisce quello nuovo.
 */
export async function saveGeneratedSchedule(
  weekStartDate: string,
  status: ScheduleStatus,
  assignments: NewAssignment[]
): Promise<WeeklySchedule> {
  const db = await getDb();
  const id = generateId();
  const generatedAt = new Date().toISOString();

  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM schedules WHERE week_start_date = ?;', [weekStartDate]);
    await db.runAsync(
      'INSERT INTO schedules (id, week_start_date, generated_at, status) VALUES (?, ?, ?, ?);',
      [id, weekStartDate, generatedAt, status]
    );
    for (const a of assignments) {
      await db.runAsync(
        `INSERT INTO shift_assignments
          (id, schedule_id, shift_template_id, date, employee_id, role_ids, manually_edited)
         VALUES (?, ?, ?, ?, ?, ?, 0);`,
        [generateId(), id, a.shiftTemplateId, a.date, a.employeeId, a.roleIds.join(',')]
      );
    }
  });

  return { id, weekStartDate, generatedAt, status };
}

/** Riassegna manualmente un turno a un altro dipendente, marcando l'assegnazione come modificata a mano. */
export async function reassignShift(assignmentId: string, employeeId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'UPDATE shift_assignments SET employee_id = ?, manually_edited = 1 WHERE id = ?;',
    [employeeId, assignmentId]
  );
}

/** Aggiunge manualmente un'assegnazione, es. per coprire un turno che il motore non è riuscito a coprire. */
export async function addManualAssignment(input: {
  scheduleId: string;
  shiftTemplateId: string;
  date: string;
  employeeId: string;
  roleIds: string[];
}): Promise<ShiftAssignment> {
  const db = await getDb();
  const id = generateId();
  await db.runAsync(
    `INSERT INTO shift_assignments
      (id, schedule_id, shift_template_id, date, employee_id, role_ids, manually_edited)
     VALUES (?, ?, ?, ?, ?, ?, 1);`,
    [id, input.scheduleId, input.shiftTemplateId, input.date, input.employeeId, input.roleIds.join(',')]
  );
  return { id, manuallyEdited: true, ...input };
}

export async function deleteAssignment(assignmentId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM shift_assignments WHERE id = ?;', [assignmentId]);
}
