import { useCallback, useEffect, useState } from 'react';
import { timeOffRepository } from '@/src/db/repositories';
import { TimeOff } from '@/src/models';

export function useTimeOff(employeeId: string | null) {
  const [timeOff, setTimeOff] = useState<TimeOff[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!employeeId) {
      setTimeOff([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const data = await timeOffRepository.listTimeOffForEmployee(employeeId);
    setTimeOff(data);
    setLoading(false);
  }, [employeeId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const toggleDay = useCallback(
    async (date: string) => {
      if (!employeeId) return;
      await timeOffRepository.toggleTimeOff(employeeId, date);
      await reload();
    },
    [employeeId, reload]
  );

  return { timeOff, loading, reload, toggleDay };
}
