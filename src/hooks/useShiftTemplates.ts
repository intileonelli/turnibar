import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { shiftTemplateRepository } from '@/src/db/repositories';
import { ShiftTemplate } from '@/src/models';

export function useShiftTemplates() {
  const [shiftTemplates, setShiftTemplates] = useState<ShiftTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    const data = await shiftTemplateRepository.listShiftTemplates();
    setShiftTemplates(data);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  return { shiftTemplates, loading, reload };
}
