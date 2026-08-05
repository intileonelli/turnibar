import { getDb } from '@/src/db/client';
import { Role } from '@/src/models';
import { generateId } from '@/src/utils/id';

interface RoleRow {
  id: string;
  name: string;
  color: string;
}

function mapRow(row: RoleRow): Role {
  return { id: row.id, name: row.name, color: row.color };
}

export async function listRoles(): Promise<Role[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<RoleRow>('SELECT * FROM roles ORDER BY name;');
  return rows.map(mapRow);
}

export async function getRole(id: string): Promise<Role | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<RoleRow>('SELECT * FROM roles WHERE id = ?;', [id]);
  return row ? mapRow(row) : null;
}

export async function createRole(input: Omit<Role, 'id'>): Promise<Role> {
  const db = await getDb();
  const id = generateId();
  await db.runAsync('INSERT INTO roles (id, name, color) VALUES (?, ?, ?);', [
    id,
    input.name,
    input.color,
  ]);
  return { id, ...input };
}

export async function updateRole(role: Role): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE roles SET name = ?, color = ? WHERE id = ?;', [
    role.name,
    role.color,
    role.id,
  ]);
}

export async function deleteRole(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM roles WHERE id = ?;', [id]);
}
