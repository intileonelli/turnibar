import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { roleRepository } from '@/src/db/repositories';
import { Role } from '@/src/models';

export function useRoles() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    const data = await roleRepository.listRoles();
    setRoles(data);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  return { roles, loading, reload };
}
