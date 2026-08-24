import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  employeeRepository,
  roleRepository,
  scheduleRepository,
  shiftTemplateRepository,
  shopRepository,
  timeOffRepository,
  unavailabilityRepository,
} from '@/src/db/repositories';
import { ScheduleStatus, ShiftAssignment, WeeklySchedule } from '@/src/models';
import { generateSchedule, ScheduleResult } from '@/src/engine';

export function useSchedule(weekStartDate: string) {
  const [schedule, setSchedule] = useState<WeeklySchedule | null>(null);
  const [assignments, setAssignments] = useState<ShiftAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [lastResult, setLastResult] = useState<ScheduleResult | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    const found = await scheduleRepository.getScheduleForWeek(weekStartDate);
    setSchedule(found);
    setAssignments(found ? await scheduleRepository.listAssignmentsForSchedule(found.id) : []);
    setLoading(false);
  }, [weekStartDate]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  const generate = useCallback(async (): Promise<ScheduleResult> => {
    setGenerating(true);
    try {
      const [employees, shiftTemplates, unavailabilities, timeOff, roles, shopSettings] = await Promise.all([
        employeeRepository.listEmployees(),
        shiftTemplateRepository.listShiftTemplates(),
        unavailabilityRepository.listAllUnavailabilities(),
        timeOffRepository.listAllTimeOff(),
        roleRepository.listRoles(),
        shopRepository.getShopSettings(),
      ]);

      const result = generateSchedule(
        {
          weekStartDate,
          employees,
          shiftTemplates,
          unavailabilities,
          timeOff,
          allowMultipleShiftsPerDay: shopSettings.allowMultipleShiftsPerDay,
        },
        roles
      );
      setLastResult(result);

      const status: ScheduleStatus = result.unresolvedShifts.length > 0 ? 'incomplete' : 'complete';
      await scheduleRepository.saveGeneratedSchedule(weekStartDate, status, result.assignments);
      await reload();
      return result;
    } finally {
      setGenerating(false);
    }
  }, [weekStartDate, reload]);

  const reassign = useCallback(
    async (assignmentId: string, employeeId: string) => {
      await scheduleRepository.reassignShift(assignmentId, employeeId);
      await reload();
    },
    [reload]
  );

  const removeAssignment = useCallback(
    async (assignmentId: string) => {
      await scheduleRepository.deleteAssignment(assignmentId);
      await reload();
    },
    [reload]
  );

  const addManualAssignment = useCallback(
    async (input: { shiftTemplateId: string; date: string; employeeId: string; roleIds: string[] }) => {
      if (!schedule) return;
      await scheduleRepository.addManualAssignment({ scheduleId: schedule.id, ...input });
      await reload();
    },
    [schedule, reload]
  );

  return {
    schedule,
    assignments,
    loading,
    generating,
    lastResult,
    generate,
    reassign,
    removeAssignment,
    addManualAssignment,
    reload,
  };
}
