/**
 * Trasforma i requisiti dei turni tipo da "un ruolo per requisito" a "un elenco di ruoli
 * in ordine di priorità" (ruolo principale + alternative), per gestire casi come "Cuoca,
 * altrimenti Barista esperto" quando il ruolo principale non è disponibile.
 */
export const MIGRATION_002_ROLE_PRIORITY = {
  version: 2,
  sql: `
    ALTER TABLE shift_template_requirements RENAME TO shift_template_requirements_old;

    CREATE TABLE shift_template_requirements (
      id TEXT PRIMARY KEY NOT NULL,
      shift_template_id TEXT NOT NULL REFERENCES shift_templates(id) ON DELETE CASCADE,
      count INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_requirements_template ON shift_template_requirements(shift_template_id);

    CREATE TABLE shift_template_requirement_roles (
      id TEXT PRIMARY KEY NOT NULL,
      requirement_id TEXT NOT NULL REFERENCES shift_template_requirements(id) ON DELETE CASCADE,
      role_id TEXT NOT NULL REFERENCES roles(id),
      priority INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_requirement_roles_requirement ON shift_template_requirement_roles(requirement_id);

    INSERT INTO shift_template_requirements (id, shift_template_id, count)
      SELECT id, shift_template_id, count FROM shift_template_requirements_old;

    INSERT INTO shift_template_requirement_roles (id, requirement_id, role_id, priority)
      SELECT id || '-role', id, role_id, 0 FROM shift_template_requirements_old;

    DROP TABLE shift_template_requirements_old;
  `,
};
