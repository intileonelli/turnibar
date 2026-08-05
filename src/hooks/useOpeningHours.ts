import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { shopRepository } from '@/src/db/repositories';
import { OpeningHours } from '@/src/models';

export function useOpeningHours() {
  const [openingHours, setOpeningHours] = useState<OpeningHours[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    const data = await shopRepository.listOpeningHours();
    setOpeningHours(data);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  return { openingHours, loading, reload };
}
