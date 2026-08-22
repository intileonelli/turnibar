import type { SQLiteDatabase } from 'expo-sqlite';
import { MIGRATION_001_INIT } from './001_init';
import { MIGRATION_002_ROLE_PRIORITY } from './002_role_priority';
import { MIGRATION_003_EMPLOYEE_FLEXIBILITY } from './003_employee_flexibility';
import { MIGRATION_004_SHOP_SETTINGS } from './004_shop_settings';
import { MIGRATION_005_ASSIGNMENT_ROLES } from './005_assignment_roles';
import { MIGRATION_006_EMPLOYEE_CONSTRAINTS } from './006_employee_constraints';

const MIGRATIONS = [
  MIGRATION_001_INIT,
  MIGRATION_002_ROLE_PRIORITY,
  MIGRATION_003_EMPLOYEE_FLEXIBILITY,
  MIGRATION_004_SHOP_SETTINGS,
  MIGRATION_005_ASSIGNMENT_ROLES,
  MIGRATION_006_EMPLOYEE_CONSTRAINTS,
];

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
