import { supabase } from '@/src/lib/supabase';
import { RoleRequirement, ShiftTemplate, Weekday } from '@/src/models';

interface ShiftTemplateRow {
  id: string;
  weekday: Weekday;
  name: string;
  start_time: string;
  end_time: string;
  category_id: string;
  sort_order: number;
}

interface RequirementRow {
  id: string;
  shift_template_id: string;
  role_ids: string[];
  count: number;
}

async function insertRequirements(shiftTemplateId: string, requirements: RoleRequirement[]): Promise<void> {
  if (!requirements.length) return;
  const { error } = await supabase.from('shift_template_requirements').insert(
    requirements.map((r) => ({ shift_template_id: shiftTemplateId, role_ids: r.roleIds, count: r.count }))
  );
  if (error) throw error;
}

export async function listShiftTemplates(): Promise<ShiftTemplate[]> {
  const { data: templateRows, error: templateError } = await supabase
    .from('shift_templates')
    .select('*')
    .order('weekday')
    .order('sort_order');
  if (templateError) throw templateError;

  const { data: requirementRows, error: reqError } = await supabase
    .from('shift_template_requirements')
    .select('*');
  if (reqError) throw reqError;

  const requirementsByTemplate = new Map<string, RoleRequirement[]>();
  for (const r of (requirementRows ?? []) as RequirementRow[]) {
    const list = requirementsByTemplate.get(r.shift_template_id) ?? [];
    list.push({ roleIds: r.role_ids, count: r.count });
    requirementsByTemplate.set(r.shift_template_id, list);
  }

  return ((templateRows ?? []) as ShiftTemplateRow[]).map((row) => ({
    id: row.id,
    weekday: row.weekday,
    name: row.name,
    startTime: row.start_time,
    endTime: row.end_time,
    categoryId: row.category_id,
    sortOrder: row.sort_order,
    requirements: requirementsByTemplate.get(row.id) ?? [],
  }));
}

export async function listShiftTemplatesForWeekday(weekday: Weekday): Promise<ShiftTemplate[]> {
  const all = await listShiftTemplates();
  return all.filter((t) => t.weekday === weekday);
}

/** Nuovo turno: va sempre in fondo alla sequenza di quel giorno, così l'ordine degli altri non cambia. */
async function nextSortOrder(weekday: Weekday): Promise<number> {
  const { data, error } = await supabase
    .from('shift_templates')
    .select('sort_order')
    .eq('weekday', weekday)
    .order('sort_order', { ascending: false })
    .limit(1);
  if (error) throw error;
  return (data?.[0]?.sort_order ?? -1) + 1;
}

export async function createShiftTemplate(input: Omit<ShiftTemplate, 'id' | 'sortOrder'>): Promise<ShiftTemplate> {
  const sortOrder = await nextSortOrder(input.weekday);
  const { data: template, error } = await supabase
    .from('shift_templates')
    .insert({
      weekday: input.weekday,
      name: input.name,
      start_time: input.startTime,
      end_time: input.endTime,
      category_id: input.categoryId,
      sort_order: sortOrder,
    })
    .select()
    .single();
  if (error) throw error;

  await insertRequirements(template.id, input.requirements);

  return { id: template.id, sortOrder, ...input };
}

/** L'ordine si cambia solo tramite reorderShiftTemplates: qui si aggiorna tutto il resto senza toccarlo. */
export async function updateShiftTemplate(template: ShiftTemplate): Promise<void> {
  const { error } = await supabase
    .from('shift_templates')
    .update({
      weekday: template.weekday,
      name: template.name,
      start_time: template.startTime,
      end_time: template.endTime,
      category_id: template.categoryId,
    })
    .eq('id', template.id);
  if (error) throw error;

  const { error: deleteError } = await supabase
    .from('shift_template_requirements')
    .delete()
    .eq('shift_template_id', template.id);
  if (deleteError) throw deleteError;

  await insertRequirements(template.id, template.requirements);
}

/** Riassegna l'ordine di visualizzazione dei turni di un giorno secondo la sequenza data. */
export async function reorderShiftTemplates(orderedIds: string[]): Promise<void> {
  const results = await Promise.all(
    orderedIds.map((id, index) => supabase.from('shift_templates').update({ sort_order: index }).eq('id', id))
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) throw failed.error;
}

export async function deleteShiftTemplate(id: string): Promise<void> {
  const { error: assignmentsError } = await supabase
    .from('shift_assignments')
    .delete()
    .eq('shift_template_id', id);
  if (assignmentsError) throw assignmentsError;

  const { error } = await supabase.from('shift_templates').delete().eq('id', id);
  if (error) throw error;
}

/** Elimina in un colpo solo tutti i turni tipo di un giorno della settimana. */
export async function deleteShiftTemplatesForWeekday(weekday: Weekday): Promise<void> {
  const { data: templates, error: templatesError } = await supabase
    .from('shift_templates')
    .select('id')
    .eq('weekday', weekday);
  if (templatesError) throw templatesError;

  const ids = (templates ?? []).map((t) => t.id);
  if (ids.length) {
    const { error: assignmentsError } = await supabase
      .from('shift_assignments')
      .delete()
      .in('shift_template_id', ids);
    if (assignmentsError) throw assignmentsError;
  }

  const { error } = await supabase.from('shift_templates').delete().eq('weekday', weekday);
  if (error) throw error;
}
