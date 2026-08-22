import { getDb } from '@/src/db/local/client';
import { RoleRequirement, ShiftTemplate, Weekday } from '@/src/models';
import { generateId } from '@/src/utils/id';

interface ShiftTemplateRow {
  id: string;
  weekday: Weekday;
  name: string;
  start_time: string;
  end_time: string;
}

interface RequirementRow {
  id: string;
  shift_template_id: string;
  count: number;
}

interface RequirementRoleRow {
  id: string;
  requirement_id: string;
  role_id: string;
  priority: number;
}

async function loadRequirements(
  db: Awaited<ReturnType<typeof getDb>>,
  shiftTemplateId: string
): Promise<RoleRequirement[]> {
  const requirementRows = await db.getAllAsync<RequirementRow>(
    'SELECT * FROM shift_template_requirements WHERE shift_template_id = ?;',
    [shiftTemplateId]
  );
  const requirements: RoleRequirement[] = [];
  for (const req of requirementRows) {
    const roleRows = await db.getAllAsync<RequirementRoleRow>(
      'SELECT * FROM shift_template_requirement_roles WHERE requirement_id = ? ORDER BY priority ASC;',
      [req.id]
    );
    requirements.push({ roleIds: roleRows.map((r) => r.role_id), count: req.count });
  }
  return requirements;
}

async function insertRequirements(
  db: Awaited<ReturnType<typeof getDb>>,
  shiftTemplateId: string,
  requirements: RoleRequirement[]
): Promise<void> {
  for (const req of requirements) {
    const requirementId = generateId();
    await db.runAsync(
      'INSERT INTO shift_template_requirements (id, shift_template_id, count) VALUES (?, ?, ?);',
      [requirementId, shiftTemplateId, req.count]
    );
    for (let priority = 0; priority < req.roleIds.length; priority++) {
      await db.runAsync(
        'INSERT INTO shift_template_requirement_roles (id, requirement_id, role_id, priority) VALUES (?, ?, ?, ?);',
        [generateId(), requirementId, req.roleIds[priority], priority]
      );
    }
  }
}

export async function listShiftTemplates(): Promise<ShiftTemplate[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<ShiftTemplateRow>(
    'SELECT * FROM shift_templates ORDER BY weekday, start_time;'
  );
  const templates: ShiftTemplate[] = [];
  for (const row of rows) {
    const requirements = await loadRequirements(db, row.id);
    templates.push({
      id: row.id,
      weekday: row.weekday,
      name: row.name,
      startTime: row.start_time,
      endTime: row.end_time,
      requirements,
    });
  }
  return templates;
}

export async function listShiftTemplatesForWeekday(weekday: Weekday): Promise<ShiftTemplate[]> {
  const all = await listShiftTemplates();
  return all.filter((t) => t.weekday === weekday);
}

export async function createShiftTemplate(input: Omit<ShiftTemplate, 'id'>): Promise<ShiftTemplate> {
  const db = await getDb();
  const id = generateId();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      'INSERT INTO shift_templates (id, weekday, name, start_time, end_time) VALUES (?, ?, ?, ?, ?);',
      [id, input.weekday, input.name, input.startTime, input.endTime]
    );
    await insertRequirements(db, id, input.requirements);
  });
  return { id, ...input };
}

export async function updateShiftTemplate(template: ShiftTemplate): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      'UPDATE shift_templates SET weekday = ?, name = ?, start_time = ?, end_time = ? WHERE id = ?;',
      [template.weekday, template.name, template.startTime, template.endTime, template.id]
    );
    await db.runAsync('DELETE FROM shift_template_requirements WHERE shift_template_id = ?;', [
      template.id,
    ]);
    await insertRequirements(db, template.id, template.requirements);
  });
}

export async function deleteShiftTemplate(id: string): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    // Le assegnazioni generate per questo turno tipo non hanno un ON DELETE CASCADE
    // (sono un dato storico legato a una pianificazione salvata), quindi vanno rimosse
    // esplicitamente prima di eliminare il turno tipo, altrimenti il vincolo di integrità
    // referenziale blocca la cancellazione.
    await db.runAsync('DELETE FROM shift_assignments WHERE shift_template_id = ?;', [id]);
    await db.runAsync('DELETE FROM shift_templates WHERE id = ?;', [id]);
  });
}

/** Elimina in un colpo solo tutti i turni tipo di un giorno della settimana. */
export async function deleteShiftTemplatesForWeekday(weekday: Weekday): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `DELETE FROM shift_assignments
        WHERE shift_template_id IN (SELECT id FROM shift_templates WHERE weekday = ?);`,
      [weekday]
    );
    await db.runAsync('DELETE FROM shift_templates WHERE weekday = ?;', [weekday]);
  });
}
