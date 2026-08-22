import { getDb } from '@/src/db/local/client';
import { Unavailability, Weekday } from '@/src/models';
import { generateId } from '@/src/utils/id';

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

export async function listUnavailabilitiesForEmployee(
  employeeId: string
): Promise<Unavailability[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<UnavailabilityRow>(
    'SELECT * FROM unavailabilities WHERE employee_id = ? ORDER BY weekday, start_time;',
    [employeeId]
  );
  return rows.map(mapRow);
}

export async function listAllUnavailabilities(): Promise<Unavailability[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<UnavailabilityRow>('SELECT * FROM unavailabilities;');
  return rows.map(mapRow);
}

export async function createUnavailability(
  input: Omit<Unavailability, 'id'>
): Promise<Unavailability> {
  const db = await getDb();
  const id = generateId();
  await db.runAsync(
    `INSERT INTO unavailabilities (id, employee_id, weekday, start_time, end_time, note)
     VALUES (?, ?, ?, ?, ?, ?);`,
    [id, input.employeeId, input.weekday, input.startTime, input.endTime, input.note ?? null]
  );
  return { id, ...input };
}

export async function deleteUnavailability(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM unavailabilities WHERE id = ?;', [id]);
}
