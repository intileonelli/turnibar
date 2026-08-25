import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Employee, ShiftAssignment, ShiftTemplate, WEEKDAY_LABELS_SHORT, WEEKDAYS } from '@/src/models';
import { dateForWeekday, timeToMinutes } from '@/src/engine';
import { formatDateLong } from '@/src/utils/date';
import { colors } from '@/src/components/shared/colors';

const COLUMN_WIDTH = 190;

interface WeeklyShiftGridProps {
  weekStartDate: string;
  shiftTemplates: ShiftTemplate[];
  assignments: ShiftAssignment[];
  employees: Employee[];
  onAssignmentPress: (assignment: ShiftAssignment, template: ShiftTemplate) => void;
  onEmptySlotPress: (template: ShiftTemplate, date: string, roleIds: string[]) => void;
}

export function WeeklyShiftGrid({
  weekStartDate,
  shiftTemplates,
  assignments,
  employees,
  onAssignmentPress,
  onEmptySlotPress,
}: WeeklyShiftGridProps) {
  const employeeById = new Map(employees.map((e) => [e.id, e]));

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.horizontalScroll}
      contentContainerStyle={styles.horizontalScrollContent}
    >
      <View style={styles.row}>
        {WEEKDAYS.map((weekday) => {
          const date = dateForWeekday(weekStartDate, weekday);
          const templatesForDay = shiftTemplates
            .filter((t) => t.weekday === weekday)
            .sort((a, b) => {
              const diff = timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
              return diff !== 0 ? diff : timeToMinutes(a.endTime) - timeToMinutes(b.endTime);
            });

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

                    {template.requirements.map((req, reqIndex) => {
                      const reqKey = req.roleIds.join(',');
                      const roleAssignments = cellAssignments.filter((a) => {
                        if (a.roleIds) {
                          // Il requisito riempito è registrato sull'assegnazione stessa: match
                          // esatto, evita che una stessa assegnazione compaia sotto più
                          // requisiti quando i loro ruoli si sovrappongono (es. tramite il
                          // ruolo secondario di un dipendente).
                          return a.roleIds.join(',') === reqKey;
                        }
                        // Fallback per assegnazioni generate prima dell'introduzione di
                        // roleIds sull'assegnazione: si ricava dal ruolo del dipendente.
                        const emp = employeeById.get(a.employeeId);
                        if (!emp) return false;
                        return (
                          req.roleIds.includes(emp.roleId) ||
                          (emp.secondaryRoleId ? req.roleIds.includes(emp.secondaryRoleId) : false)
                        );
                      });
                      const missing = req.count - roleAssignments.length;

                      return (
                        <View key={reqIndex} style={styles.roleBlock}>
                          <View style={styles.chipsRow}>
                            {roleAssignments.map((a) => {
                              const employee = employeeById.get(a.employeeId);
                              let isFallback = false;
                              if (employee) {
                                const primaryIdx = req.roleIds.indexOf(employee.roleId);
                                const secondaryIdx = employee.secondaryRoleId
                                  ? req.roleIds.indexOf(employee.secondaryRoleId)
                                  : -1;
                                const matched = [primaryIdx, secondaryIdx].filter((i) => i !== -1);
                                isFallback = matched.length > 0 && Math.min(...matched) > 0;
                              }
                              return (
                                <Pressable
                                  key={a.id}
                                  onPress={() => onAssignmentPress(a, template)}
                                  style={[
                                    styles.employeeChip,
                                    { borderColor: employee?.color ?? colors.border },
                                  ]}
                                >
                                  <Text style={styles.employeeChipText}>
                                    {employee?.name ?? '—'}
                                    {isFallback ? ' ⚠' : ''}
                                    {a.manuallyEdited ? ' ✎' : ''}
                                  </Text>
                                </Pressable>
                              );
                            })}
                            {missing > 0 &&
                              Array.from({ length: missing }).map((_, i) => (
                                <Pressable
                                  key={`empty-${i}`}
                                  onPress={() => onEmptySlotPress(template, date, req.roleIds)}
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
  horizontalScroll: {
    flexGrow: 0,
    flexShrink: 0,
  },
  horizontalScrollContent: {
    flexGrow: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  column: {
    width: COLUMN_WIDTH,
    paddingHorizontal: 4,
  },
  columnHeader: {
    marginBottom: 6,
    alignItems: 'center',
  },
  weekdayLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  dateLabel: {
    fontSize: 10,
    color: colors.textMuted,
  },
  emptyDay: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 8,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 6,
    marginBottom: 6,
  },
  shiftName: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textMuted,
  },
  shiftTime: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  roleBlock: {
    marginBottom: 2,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  employeeChip: {
    borderWidth: 1.5,
    borderRadius: 6,
    paddingVertical: 2,
    paddingHorizontal: 6,
    marginRight: 4,
    marginBottom: 4,
  },
  employeeChipText: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '700',
  },
  emptySlot: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.textMuted,
    borderRadius: 6,
    paddingVertical: 2,
    paddingHorizontal: 6,
    marginRight: 4,
    marginBottom: 4,
  },
  emptySlotText: {
    fontSize: 11,
    color: colors.textMuted,
  },
});
