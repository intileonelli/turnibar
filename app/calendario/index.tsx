import { useCallback, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
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
import { useShopSettings } from '@/src/hooks/useShopSettings';
import { useCompany } from '@/src/hooks/useCompany';
import { unavailabilityRepository, timeOffRepository } from '@/src/db/repositories';
import { ShiftAssignment, ShiftTemplate, TimeOff, Unavailability } from '@/src/models';
import { formatDateLong } from '@/src/utils/date';
import { exportWeekAsPdf } from '@/src/utils/exportSchedulePdf';
import { strings } from '@/src/i18n/strings';
import { useCurrentAuth } from '@/src/context/AuthContext';

interface PickerTarget {
  template: ShiftTemplate;
  date: string;
  roleIds: string[];
  currentAssignmentId?: string;
}

export default function CalendarScreen() {
  const router = useRouter();
  const { profile } = useCurrentAuth();
  const isOwner = profile?.role === 'owner';
  const { weekStartDate, goToNextWeek, goToPreviousWeek, goToCurrentWeek } = useScheduleStore();
  const { schedule, assignments, reassign, removeAssignment, addManualAssignment } = useSchedule(weekStartDate);
  const { employees } = useEmployees();
  const { roles } = useRoles();
  const { shiftTemplates } = useShiftTemplates();
  const { settings: shopSettings } = useShopSettings();
  const { company } = useCompany();

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
    if (!isOwner) return;
    let roleIds = assignment.roleIds;
    if (!roleIds) {
      // Assegnazione generata prima dell'introduzione di roleIds sull'assegnazione: si ricava
      // il requisito più probabile dal ruolo del dipendente.
      const employee = employees.find((e) => e.id === assignment.employeeId);
      const matchingRequirement = employee
        ? template.requirements.find((r) => r.roleIds.includes(employee.roleId))
        : undefined;
      roleIds = matchingRequirement?.roleIds ?? template.requirements[0]?.roleIds ?? [];
    }
    setPickerTarget({
      template,
      date: assignment.date,
      roleIds,
      currentAssignmentId: assignment.id,
    });
  };

  const handleEmptySlotPress = (template: ShiftTemplate, date: string, roleIds: string[]) => {
    if (!isOwner) return;
    setPickerTarget({ template, date, roleIds });
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
        roleIds: pickerTarget.roleIds,
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

  const handleExportPdf = () => {
    exportWeekAsPdf({
      companyName: company?.name ?? strings.home.title,
      weekStartDate,
      shiftTemplates,
      assignments,
      employees,
    });
  };

  return (
    <ScreenContainer>
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
        {isOwner && (
          <View style={styles.actionButton}>
            <Button label={strings.calendar.generate} onPress={() => router.push('/calendario/genera')} />
          </View>
        )}
      </View>

      {Platform.OS === 'web' && schedule && (
        <View style={styles.pdfRow}>
          <Button label="Scarica PDF" variant="secondary" onPress={handleExportPdf} />
        </View>
      )}

      {!schedule && <Text style={styles.empty}>{strings.calendar.noSchedule}</Text>}

      <WeeklyShiftGrid
        weekStartDate={weekStartDate}
        shiftTemplates={shiftTemplates}
        assignments={assignments}
        employees={employees}
        onAssignmentPress={handleAssignmentPress}
        onEmptySlotPress={handleEmptySlotPress}
      />

      <AssignmentPickerModal
        visible={pickerTarget !== null}
        onClose={() => setPickerTarget(null)}
        template={pickerTarget?.template ?? null}
        date={pickerTarget?.date ?? ''}
        roleIds={pickerTarget?.roleIds ?? []}
        employees={employees}
        roles={roles}
        currentAssignmentId={pickerTarget?.currentAssignmentId}
        allAssignmentsThisWeek={assignments}
        shiftTemplates={shiftTemplates}
        unavailabilities={unavailabilities}
        timeOff={timeOff}
        allowMultipleShiftsPerDay={shopSettings.allowMultipleShiftsPerDay}
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
  pdfRow: {
    marginBottom: 12,
  },
  empty: {
    textAlign: 'center',
    color: colors.textMuted,
    marginBottom: 12,
  },
});
