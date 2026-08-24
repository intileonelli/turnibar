import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { shiftCategoryRepository } from '@/src/db/repositories';
import { ShiftCategory } from '@/src/models';

export function useShiftCategories() {
  const [categories, setCategories] = useState<ShiftCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    const data = await shiftCategoryRepository.listShiftCategories();
    setCategories(data);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  return { categories, loading, reload };
}
