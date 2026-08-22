/**
 * Rende opzionali le ore contrattuali e il tetto massimo di ore settimanali (alcune aziende non
 * vogliono vincolare i turni al monte ore), e aggiunge: ruolo secondario/di riserva, numero
 * massimo di giorni lavorativi a settimana, e giorni della settimana preferiti.
 *
 * Altre tabelle (unavailabilities, time_off, shift_assignments) hanno una foreign key verso
 * employees(id) gia esistente da prima di questa migrazione. Per questo la tabella va ricreata
 * con un nome temporaneo e poi rinominata al posto dell'originale (invece di rinominare
 * l'originale via e ricreare "employees" da zero): rinominando l'originale via, SQLite
 * riscrive i riferimenti delle altre tabelle sul nome temporaneo, e quel nome sparirebbe non
 * appena la tabella temporanea viene eliminata, lasciando riferimenti pendenti verso una
 * tabella inesistente.
 */
export const MIGRATION_003_EMPLOYEE_FLEXIBILITY = {
  version: 3,
  sql: `
    DROP TABLE IF EXISTS employees_new;

    CREATE TABLE employees_new (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      role_id TEXT NOT NULL REFERENCES roles(id),
      secondary_role_id TEXT REFERENCES roles(id),
      weekly_contract_hours REAL,
      max_weekly_hours REAL,
      max_weekly_shifts INTEGER,
      max_weekly_days INTEGER,
      preferred_weekdays TEXT,
      preference TEXT NOT NULL DEFAULT 'nessuna',
      active INTEGER NOT NULL DEFAULT 1
    );

    INSERT INTO employees_new
      (id, name, role_id, weekly_contract_hours, max_weekly_hours, max_weekly_shifts, preference, active)
      SELECT id, name, role_id, weekly_contract_hours, max_weekly_hours, max_weekly_shifts, preference, active
      FROM employees;

    DROP TABLE employees;

    ALTER TABLE employees_new RENAME TO employees;
  `,
};
