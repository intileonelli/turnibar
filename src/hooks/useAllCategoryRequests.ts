import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { categoryRequestRepository } from '@/src/db/repositories';
import { CategoryRequest } from '@/src/models';

/** Fasce orarie richieste da TUTTI i dipendenti, per una vista unificata nella schermata ferie. */
export function useAllCategoryRequests() {
  const [allCategoryRequests, setAllCategoryRequests] = useState<CategoryRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    const data = await categoryRequestRepository.listAllCategoryRequests();
    setAllCategoryRequests(data);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  return { allCategoryRequests, loading, reload };
}
