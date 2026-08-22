import { getDb } from '@/src/db/local/client';
import { TimeOff } from '@/src/models';
import { generateId } from '@/src/utils/id';

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
  const db = await getDb();
  const rows = await db.getAllAsync<TimeOffRow>(
    'SELECT * FROM time_off WHERE employee_id = ? ORDER BY date;',
    [employeeId]
  );
  return rows.map(mapRow);
}

export async function listAllTimeOff(): Promise<TimeOff[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<TimeOffRow>('SELECT * FROM time_off;');
  return rows.map(mapRow);
}

/** Marca un giorno come ferie per il dipendente. Se già marcato, non fa nulla. */
export async function addTimeOff(employeeId: string, date: string, note?: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT OR IGNORE INTO time_off (id, employee_id, date, note) VALUES (?, ?, ?, ?);',
    [generateId(), employeeId, date, note ?? null]
  );
}

/** Rimuove il giorno di ferie per il dipendente, se presente. */
export async function removeTimeOff(employeeId: string, date: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM time_off WHERE employee_id = ? AND date = ?;', [
    employeeId,
    date,
  ]);
}

/** Inverte lo stato di ferie per un giorno: lo aggiunge se assente, lo rimuove se presente. */
export async function toggleTimeOff(employeeId: string, date: string): Promise<boolean> {
  const db = await getDb();
  const existing = await db.getFirstAsync<TimeOffRow>(
    'SELECT * FROM time_off WHERE employee_id = ? AND date = ?;',
    [employeeId, date]
  );
  if (existing) {
    await db.runAsync('DELETE FROM time_off WHERE id = ?;', [existing.id]);
    return false;
  }
  await db.runAsync('INSERT INTO time_off (id, employee_id, date) VALUES (?, ?, ?);', [
    generateId(),
    employeeId,
    date,
  ]);
  return true;
}
