import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { membershipRepository } from '@/src/db/repositories';
import { CompanyInfo } from '@/src/db/repositories/membershipRepository';

export function useCompany() {
  const [company, setCompany] = useState<CompanyInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    const data = await membershipRepository.getMyCompany();
    setCompany(data);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  return { company, loading, reload };
}
