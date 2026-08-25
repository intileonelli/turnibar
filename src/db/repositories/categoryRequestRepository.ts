import { supabase } from '@/src/lib/supabase';
import { CategoryRequest } from '@/src/models';

interface CategoryRequestRow {
  id: string;
  employee_id: string;
  date: string;
  category_id: string;
  note: string | null;
}

function mapRow(row: CategoryRequestRow): CategoryRequest {
  return {
    id: row.id,
    employeeId: row.employee_id,
    date: row.date,
    categoryId: row.category_id,
    note: row.note ?? undefined,
  };
}

export async function listCategoryRequestsForEmployee(employeeId: string): Promise<CategoryRequest[]> {
  const { data, error } = await supabase
    .from('category_requests')
    .select('*')
    .eq('employee_id', employeeId)
    .order('date');
  if (error) throw error;
  return (data ?? []).map(mapRow);
}

export async function listAllCategoryRequests(): Promise<CategoryRequest[]> {
  const { data, error } = await supabase.from('category_requests').select('*');
  if (error) throw error;
  return (data ?? []).map(mapRow);
}

/** Imposta (o sostituisce) la fascia oraria richiesta dal dipendente per una data. */
export async function setCategoryRequest(
  employeeId: string,
  date: string,
  categoryId: string,
  note?: string
): Promise<void> {
  const { error } = await supabase
    .from('category_requests')
    .upsert(
      { employee_id: employeeId, date, category_id: categoryId, note: note ?? null },
      { onConflict: 'employee_id,date' }
    );
  if (error) throw error;
}

/** Rimuove la fascia oraria richiesta per una data, se presente. */
export async function removeCategoryRequest(employeeId: string, date: string): Promise<void> {
  const { error } = await supabase
    .from('category_requests')
    .delete()
    .eq('employee_id', employeeId)
    .eq('date', date);
  if (error) throw error;
}
