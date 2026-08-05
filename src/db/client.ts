import * as SQLite from 'expo-sqlite';
import { runMigrations } from './migrations';
import { generateId } from '@/src/utils/id';
import { WEEKDAYS } from '@/src/models/weekday';

const DB_NAME = 'turnibar.db';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function seedDefaults(db: SQLite.SQLiteDatabase): Promise<void> {
  const existing = await db.getAllAsync<{ weekday: number }>(
    'SELECT weekday FROM opening_hours;'
  );
  const existingWeekdays = new Set(existing.map((r) => r.weekday));

  for (const weekday of WEEKDAYS) {
    if (existingWeekdays.has(weekday)) continue;
    const closed = weekday === 7; // domenica chiusa di default
    await db.runAsync(
      `INSERT INTO opening_hours (id, weekday, closed, open_time, close_time) VALUES (?, ?, ?, ?, ?);`,
      [generateId(), weekday, closed ? 1 : 0, '09:00', '20:00']
    );
  }
}

async function initDb(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  await db.execAsync('PRAGMA foreign_keys = ON;');
  await runMigrations(db);
  await seedDefaults(db);
  return db;
}

/** Restituisce la connessione SQLite condivisa, inizializzandola (schema + seed) al primo utilizzo. */
export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = initDb();
  }
  return dbPromise;
}
