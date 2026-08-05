import { getDb } from '@/src/db/client';
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
  role_id: string;
  count: number;
}

async function loadRequirements(
  db: Awaited<ReturnType<typeof getDb>>,
  shiftTemplateId: string
): Promise<RoleRequirement[]> {
  const rows = await db.getAllAsync<RequirementRow>(
    'SELECT * FROM shift_template_requirements WHERE shift_template_id = ?;',
    [shiftTemplateId]
  );
  return rows.map((r) => ({ roleId: r.role_id, count: r.count }));
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
    for (const req of input.requirements) {
      await db.runAsync(
        'INSERT INTO shift_template_requirements (id, shift_template_id, role_id, count) VALUES (?, ?, ?, ?);',
        [generateId(), id, req.roleId, req.count]
      );
    }
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
    for (const req of template.requirements) {
      await db.runAsync(
        'INSERT INTO shift_template_requirements (id, shift_template_id, role_id, count) VALUES (?, ?, ?, ?);',
        [generateId(), template.id, req.roleId, req.count]
      );
    }
  });
}

export async function deleteShiftTemplate(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM shift_templates WHERE id = ?;', [id]);
}
