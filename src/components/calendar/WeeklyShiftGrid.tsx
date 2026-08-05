import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Employee, Role, ShiftAssignment, ShiftTemplate, WEEKDAY_LABELS_SHORT, WEEKDAYS } from '@/src/models';
import { dateForWeekday } from '@/src/engine';
import { formatDateLong } from '@/src/utils/date';
import { colors } from '@/src/components/shared/colors';

const COLUMN_WIDTH = 230;

interface WeeklyShiftGridProps {
  weekStartDate: string;
  shiftTemplates: ShiftTemplate[];
  assignments: ShiftAssignment[];
  employees: Employee[];
  roles: Role[];
  onAssignmentPress: (assignment: ShiftAssignment, template: ShiftTemplate) => void;
  onEmptySlotPress: (template: ShiftTemplate, date: string, roleId: string) => void;
}

export function WeeklyShiftGrid({
  weekStartDate,
  shiftTemplates,
  assignments,
  employees,
  roles,
  onAssignmentPress,
  onEmptySlotPress,
}: WeeklyShiftGridProps) {
  const employeeById = new Map(employees.map((e) => [e.id, e]));
  const roleById = new Map(roles.map((r) => [r.id, r]));

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={styles.row}>
        {WEEKDAYS.map((weekday) => {
          const date = dateForWeekday(weekStartDate, weekday);
          const templatesForDay = shiftTemplates
            .filter((t) => t.weekday === weekday)
            .sort((a, b) => a.startTime.localeCompare(b.startTime));

          return (
            <View key={weekday} style={styles.column}>
              <View style={styles.columnHeader}>
                <Text style={styles.weekdayLabel}>{WEEKDAY_LABELS_SHORT[weekday]}</Text>
                <Text style={styles.dateLabel}>{formatDateLong(date)}</Text>
              </View>

              {templatesForDay.length === 0 && (
                <Text style={styles.emptyDay}>Nessun turno</Text>
              )}

              {templatesForDay.map((template) => {
                const cellAssignments = assignments.filter(
                  (a) => a.shiftTemplateId === template.id && a.date === date
                );

                return (
                  <View key={template.id} style={styles.card}>
                    <Text style={styles.shiftName}>{template.name}</Text>
                    <Text style={styles.shiftTime}>
                      {template.startTime} - {template.endTime}
                    </Text>

                    {template.requirements.map((req) => {
                      const roleAssignments = cellAssignments.filter(
                        (a) => employeeById.get(a.employeeId)?.roleId === req.roleId
                      );
                      const role = roleById.get(req.roleId);
                      const missing = req.count - roleAssignments.length;

                      return (
                        <View key={req.roleId} style={styles.roleBlock}>
                          <Text style={styles.roleLabel}>
                            {role?.name ?? req.roleId} ({roleAssignments.length}/{req.count})
                          </Text>
                          <View style={styles.chipsRow}>
                            {roleAssignments.map((a) => {
                              const employee = employeeById.get(a.employeeId);
                              return (
                                <Pressable
                                  key={a.id}
                                  onPress={() => onAssignmentPress(a, template)}
                                  style={[
                                    styles.employeeChip,
                                    { borderColor: role?.color ?? colors.border },
                                  ]}
                                >
                                  <Text style={styles.employeeChipText}>
                                    {employee?.name ?? '—'}
                                    {a.manuallyEdited ? ' ✎' : ''}
                                  </Text>
                                </Pressable>
                              );
                            })}
                            {missing > 0 &&
                              Array.from({ length: missing }).map((_, i) => (
                                <Pressable
                                  key={`empty-${i}`}
                                  onPress={() => onEmptySlotPress(template, date, req.roleId)}
                                  style={styles.emptySlot}
                                >
                                  <Text style={styles.emptySlotText}>+ Assegna</Text>
                                </Pressable>
                              ))}
                          </View>
                        </View>
                      );
                    })}
                  </View>
                );
              })}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
  },
  column: {
    width: COLUMN_WIDTH,
    paddingHorizontal: 6,
  },
  columnHeader: {
    marginBottom: 10,
    alignItems: 'center',
  },
  weekdayLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  dateLabel: {
    fontSize: 12,
    color: colors.textMuted,
  },
  emptyDay: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 12,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
    marginBottom: 10,
  },
  shiftName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  shiftTime: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 8,
  },
  roleBlock: {
    marginBottom: 6,
  },
  roleLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: 4,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  employeeChip: {
    borderWidth: 1.5,
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginRight: 6,
    marginBottom: 6,
  },
  employeeChipText: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '600',
  },
  emptySlot: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.textMuted,
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginRight: 6,
    marginBottom: 6,
  },
  emptySlotText: {
    fontSize: 12,
    color: colors.textMuted,
  },
});
