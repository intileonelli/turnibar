export const MIGRATION_001_INIT = {
  version: 1,
  sql: `
    CREATE TABLE IF NOT EXISTS roles (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      color TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS employees (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      role_id TEXT NOT NULL REFERENCES roles(id),
      weekly_contract_hours REAL NOT NULL,
      max_weekly_hours REAL NOT NULL,
      max_weekly_shifts INTEGER,
      preference TEXT NOT NULL DEFAULT 'nessuna',
      active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS unavailabilities (
      id TEXT PRIMARY KEY NOT NULL,
      employee_id TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
      weekday INTEGER NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      note TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_unavailabilities_employee ON unavailabilities(employee_id);

    CREATE TABLE IF NOT EXISTS time_off (
      id TEXT PRIMARY KEY NOT NULL,
      employee_id TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      note TEXT,
      UNIQUE(employee_id, date)
    );
    CREATE INDEX IF NOT EXISTS idx_time_off_employee ON time_off(employee_id);
    CREATE INDEX IF NOT EXISTS idx_time_off_date ON time_off(date);

    CREATE TABLE IF NOT EXISTS opening_hours (
      id TEXT PRIMARY KEY NOT NULL,
      weekday INTEGER NOT NULL UNIQUE,
      closed INTEGER NOT NULL DEFAULT 0,
      open_time TEXT NOT NULL DEFAULT '09:00',
      close_time TEXT NOT NULL DEFAULT '20:00'
    );

    CREATE TABLE IF NOT EXISTS shift_templates (
      id TEXT PRIMARY KEY NOT NULL,
      weekday INTEGER NOT NULL,
      name TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_shift_templates_weekday ON shift_templates(weekday);

    CREATE TABLE IF NOT EXISTS shift_template_requirements (
      id TEXT PRIMARY KEY NOT NULL,
      shift_template_id TEXT NOT NULL REFERENCES shift_templates(id) ON DELETE CASCADE,
      role_id TEXT NOT NULL REFERENCES roles(id),
      count INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_requirements_template ON shift_template_requirements(shift_template_id);

    CREATE TABLE IF NOT EXISTS schedules (
      id TEXT PRIMARY KEY NOT NULL,
      week_start_date TEXT NOT NULL UNIQUE,
      generated_at TEXT NOT NULL,
      status TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS shift_assignments (
      id TEXT PRIMARY KEY NOT NULL,
      schedule_id TEXT NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
      shift_template_id TEXT NOT NULL REFERENCES shift_templates(id),
      date TEXT NOT NULL,
      employee_id TEXT NOT NULL REFERENCES employees(id),
      manually_edited INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_assignments_schedule ON shift_assignments(schedule_id);
    CREATE INDEX IF NOT EXISTS idx_assignments_date ON shift_assignments(date);
  `,
};
