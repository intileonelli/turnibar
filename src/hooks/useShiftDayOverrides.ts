import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { shiftDayOverrideRepository } from '@/src/db/repositories';
import { ShiftDayOverride } from '@/src/models';

/** Eccezioni di orario/turno nascosto per la settimana in vista. */
export function useShiftDayOverrides(weekStartDate: string) {
  const [overrides, setOverrides] = useState<ShiftDayOverride[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    const data = await shiftDayOverrideRepository.listOverridesForWeek(weekStartDate);
    setOverrides(data);
    setLoading(false);
  }, [weekStartDate]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  return { overrides, loading, reload };
}
