import { supabase } from '@/src/lib/supabase';
import { ShiftCategory } from '@/src/models';

interface ShiftCategoryRow {
  id: string;
  name: string;
  sort_order: number;
}

function mapRow(row: ShiftCategoryRow): ShiftCategory {
  return { id: row.id, name: row.name, sortOrder: row.sort_order };
}

export async function listShiftCategories(): Promise<ShiftCategory[]> {
  const { data, error } = await supabase.from('shift_categories').select('*').order('sort_order');
  if (error) throw error;
  return (data ?? []).map(mapRow);
}

export async function createShiftCategory(input: Omit<ShiftCategory, 'id'>): Promise<ShiftCategory> {
  const { data, error } = await supabase
    .from('shift_categories')
    .insert({ name: input.name, sort_order: input.sortOrder })
    .select()
    .single();
  if (error) throw error;
  return mapRow(data);
}

export async function updateShiftCategory(category: ShiftCategory): Promise<void> {
  const { error } = await supabase
    .from('shift_categories')
    .update({ name: category.name, sort_order: category.sortOrder })
    .eq('id', category.id);
  if (error) throw error;
}

export async function deleteShiftCategory(id: string): Promise<void> {
  const { error } = await supabase.from('shift_categories').delete().eq('id', id);
  if (error) throw error;
}
