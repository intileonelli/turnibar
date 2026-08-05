import type { SQLiteDatabase } from 'expo-sqlite';
import { MIGRATION_001_INIT } from './001_init';

const MIGRATIONS = [MIGRATION_001_INIT];

/** Applica in ordine le migrazioni non ancora eseguite, tracciando la versione con PRAGMA user_version. */
export async function runMigrations(db: SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version;');
  const currentVersion = row?.user_version ?? 0;

  const pending = MIGRATIONS.filter((m) => m.version > currentVersion).sort(
    (a, b) => a.version - b.version
  );

  for (const migration of pending) {
    await db.execAsync(migration.sql);
    await db.execAsync(`PRAGMA user_version = ${migration.version};`);
  }
}
