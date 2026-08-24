import { getDb } from '@/src/db/local/client';
import { OpeningHours, ShopSettings, Weekday } from '@/src/models';

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

interface ShopSettingsRow {
  id: number;
  max_daily_time_off: number | null;
}

export async function getShopSettings(): Promise<ShopSettings> {
  const db = await getDb();
  const row = await db.getFirstAsync<ShopSettingsRow>('SELECT * FROM shop_settings WHERE id = 1;');
  return { maxDailyTimeOff: row?.max_daily_time_off ?? undefined, allowMultipleShiftsPerDay: false };
}

export async function updateShopSettings(settings: ShopSettings): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE shop_settings SET max_daily_time_off = ? WHERE id = 1;', [
    settings.maxDailyTimeOff ?? null,
  ]);
}
