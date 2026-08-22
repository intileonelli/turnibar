import { supabase } from '@/src/lib/supabase';
import { Role } from '@/src/models';

interface RoleRow {
  id: string;
  name: string;
  color: string;
}

function mapRow(row: RoleRow): Role {
  return { id: row.id, name: row.name, color: row.color };
}

export async function listRoles(): Promise<Role[]> {
  const { data, error } = await supabase.from('roles').select('*').order('name');
  if (error) throw error;
  return (data ?? []).map(mapRow);
}

export async function getRole(id: string): Promise<Role | null> {
  const { data, error } = await supabase.from('roles').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? mapRow(data) : null;
}

export async function createRole(input: Omit<Role, 'id'>): Promise<Role> {
  const { data, error } = await supabase
    .from('roles')
    .insert({ name: input.name, color: input.color })
    .select()
    .single();
  if (error) throw error;
  return mapRow(data);
}

export async function updateRole(role: Role): Promise<void> {
  const { error } = await supabase
    .from('roles')
    .update({ name: role.name, color: role.color })
    .eq('id', role.id);
  if (error) throw error;
}

export async function deleteRole(id: string): Promise<void> {
  const { error } = await supabase.from('roles').delete().eq('id', id);
  if (error) throw error;
}
