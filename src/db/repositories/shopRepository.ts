import { getDb } from '@/src/db/client';
import { OpeningHours, Weekday } from '@/src/models';

interface OpeningHoursRow {
  id: string;
  weekday: Weekday;
  closed: number;
  open_time: string;
  close_time: string;
}

function mapRow(row: OpeningHoursRow): OpeningHours {
  return {
    id: row.id,
    weekday: row.weekday,
    closed: row.closed === 1,
    openTime: row.open_time,
    closeTime: row.close_time,
  };
}

export async function listOpeningHours(): Promise<OpeningHours[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<OpeningHoursRow>(
    'SELECT * FROM opening_hours ORDER BY weekday;'
  );
  return rows.map(mapRow);
}

export async function updateOpeningHours(entry: OpeningHours): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'UPDATE opening_hours SET closed = ?, open_time = ?, close_time = ? WHERE id = ?;',
    [entry.closed ? 1 : 0, entry.openTime, entry.closeTime, entry.id]
  );
}
