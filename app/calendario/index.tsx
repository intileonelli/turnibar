import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { ScreenContainer } from '@/src/components/shared/ScreenContainer';
import { Button } from '@/src/components/shared/Button';
import { Badge } from '@/src/components/shared/Badge';
import { colors } from '@/src/components/shared/colors';
import { WeeklyShiftGrid } from '@/src/components/calendar/WeeklyShiftGrid';
import { AssignmentPickerModal } from '@/src/components/calendar/AssignmentPickerModal';
import { useScheduleStore } from '@/src/store/scheduleStore';
import { useSchedule } from '@/src/hooks/useSchedule';
import { useEmployees } from '@/src/hooks/useEmployees';
import { useRoles } from '@/src/hooks/useRoles';
import { useShiftTemplates } from '@/src/hooks/useShiftTemplates';
import { unavailabilityRepository, timeOffRepository } from '@/src/db/repositories';
import { ShiftAssignment, ShiftTemplate, TimeOff, Unavailability } from '@/src/models';
import { formatDateLong } from '@/src/utils/date';
import { strings } from '@/src/i18n/strings';

interface PickerTarget {
  template: ShiftTemplate;
  date: string;
  roleId: string;
  currentAssignmentId?: string;
}

export default function CalendarScreen() {
  const router = useRouter();
  const { weekStartDate, goToNextWeek, goToPreviousWeek, goToCurrentWeek } = useScheduleStore();
  const { schedule, assignments, reassign, removeAssignment, addManualAssignment } = useSchedule(weekStartDate);
  const { employees } = useEmployees();
  const { roles } = useRoles();
  const { shiftTemplates } = useShiftTemplates();

  const [unavailabilities, setUnavailabilities] = useState<Unavailability[]>([]);
  const [timeOff, setTimeOff] = useState<TimeOff[]>([]);
  const [pickerTarget, setPickerTarget] = useState<PickerTarget | null>(null);

  useFocusEffect(
    useCallback(() => {
      unavailabilityRepository.listAllUnavailabilities().then(setUnavailabilities);
      timeOffRepository.listAllTimeOff().then(setTimeOff);
    }, [])
  );

  const handleAssignmentPress = (assignment: ShiftAssignment, template: ShiftTemplate) => {
    const employee = employees.find((e) => e.id === assignment.employeeId);
    setPickerTarget({
      template,
      date: assignment.date,
      roleId: employee?.roleId ?? template.requirements[0]?.roleId,
      currentAssignmentId: assignment.id,
    });
  };

  const handleEmptySlotPress = (template: ShiftTemplate, date: string, roleId: string) => {
    setPickerTarget({ template, date, roleId });
  };

  const handleSelectEmployee = async (employeeId: string) => {
    if (!pickerTarget) return;
    if (pickerTarget.currentAssignmentId) {
      await reassign(pickerTarget.currentAssignmentId, employeeId);
    } else {
      await addManualAssignment({
        shiftTemplateId: pickerTarget.template.id,
        date: pickerTarget.date,
        employeeId,
      });
    }
    setPickerTarget(null);
  };

  const handleRemove = async () => {
    if (pickerTarget?.currentAssignmentId) {
      await removeAssignment(pickerTarget.currentAssignmentId);
    }
    setPickerTarget(null);
  };

  return (
    <ScreenContainer scroll={false}>
      <View style={styles.weekNav}>
        <Button label="←" variant="secondary" onPress={goToPreviousWeek} />
        <View style={styles.weekLabelContainer}>
          <Text style={styles.weekLabel}>{formatDateLong(weekStartDate)}</Text>
          {schedule?.status === 'incomplete' && <Badge label="Turni scoperti" tone="danger" />}
          {schedule?.status === 'complete' && <Badge label="Completo" tone="success" />}
        </View>
        <Button label="→" variant="secondary" onPress={goToNextWeek} />
      </View>

      <View style={styles.actionsRow}>
        <View style={styles.actionButton}>
          <Button label={strings.calendar.currentWeek} variant="secondary" onPress={goToCurrentWeek} />
        </View>
        <View style={styles.actionButton}>
          <Button label={strings.calendar.generate} onPress={() => router.push('/calendario/genera')} />
        </View>
      </View>

      {!schedule && <Text style={styles.empty}>{strings.calendar.noSchedule}</Text>}

      <WeeklyShiftGrid
        weekStartDate={weekStartDate}
        shiftTemplates={shiftTemplates}
        assignments={assignments}
        employees={employees}
        roles={roles}
        onAssignmentPress={handleAssignmentPress}
        onEmptySlotPress={handleEmptySlotPress}
      />

      <AssignmentPickerModal
        visible={pickerTarget !== null}
        onClose={() => setPickerTarget(null)}
        template={pickerTarget?.template ?? null}
        date={pickerTarget?.date ?? ''}
        roleId={pickerTarget?.roleId ?? ''}
        employees={employees}
        roles={roles}
        currentAssignmentId={pickerTarget?.currentAssignmentId}
        allAssignmentsThisWeek={assignments}
        shiftTemplates={shiftTemplates}
        unavailabilities={unavailabilities}
        timeOff={timeOff}
        onSelectEmployee={handleSelectEmployee}
        onRemove={pickerTarget?.currentAssignmentId ? handleRemove : undefined}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  weekNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  weekLabelContainer: {
    alignItems: 'center',
    gap: 4,
  },
  weekLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  actionButton: {
    flex: 1,
  },
  empty: {
    textAlign: 'center',
    color: colors.textMuted,
    marginBottom: 12,
  },
});
