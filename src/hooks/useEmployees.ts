import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { employeeRepository } from '@/src/db/repositories';
import { Employee } from '@/src/models';

export function useEmployees(options?: { includeInactive?: boolean }) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const includeInactive = options?.includeInactive ?? false;

  const reload = useCallback(async () => {
    setLoading(true);
    const data = await employeeRepository.listEmployees({ includeInactive });
    setEmployees(data);
    setLoading(false);
  }, [includeInactive]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  return { employees, loading, reload };
}
