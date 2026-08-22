import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { timeOffRepository } from '@/src/db/repositories';
import { TimeOff } from '@/src/models';

/** Ferie di TUTTI i dipendenti, per avere una vista unificata (es. evitare sovrapposizioni). */
export function useAllTimeOff() {
  const [allTimeOff, setAllTimeOff] = useState<TimeOff[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    const data = await timeOffRepository.listAllTimeOff();
    setAllTimeOff(data);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  return { allTimeOff, loading, reload };
}
