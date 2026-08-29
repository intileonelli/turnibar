import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Employee, ShiftAssignment, ShiftDayOverride, ShiftTemplate, WEEKDAY_LABELS_SHORT, WEEKDAYS } from '@/src/models';
import { dateForWeekday } from '@/src/engine';
import { formatDateLong } from '@/src/utils/date';
import { getContrastTextColor } from '@/src/utils/color';
import { colors } from '@/src/components/shared/colors';

const COLUMN_WIDTH = 210;

interface WeeklyShiftGridProps {
  weekStartDate: string;
  shiftTemplates: ShiftTemplate[];
  assignments: ShiftAssignment[];
  employees: Employee[];
  /** Eccezioni di orario/turno nascosto per questa settimana, chiave `${shiftTemplateId}-${date}`. */
  overridesByKey?: Map<string, ShiftDayOverride>;
  /** Se il titolare può modificare l'orario di un turno o nasconderlo per un giorno specifico. */
  canEditDay?: boolean;
  onAssignmentPress: (assignment: ShiftAssignment, template: ShiftTemplate) => void;
  onEmptySlotPress: (template: ShiftTemplate, date: string, roleIds: string[]) => void;
  onEditShiftDay?: (template: ShiftTemplate, date: string) => void;
}

export function WeeklyShiftGrid({
  weekStartDate,
  shiftTemplates,
  assignments,
  employees,
  overridesByKey,
  canEditDay = false,
  onAssignmentPress,
  onEmptySlotPress,
  onEditShiftDay,
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
            .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

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
                const override = overridesByKey?.get(`${template.id}-${date}`);
                if (override?.hidden) return null;

                const cellAssignments = assignments.filter(
                  (a) => a.shiftTemplateId === template.id && a.date === date
                );
                const displayStart = override?.startTime ?? template.startTime;
                const displayEnd = override?.endTime ?? template.endTime;
                const hasTimeOverride = !!(override?.startTime || override?.endTime);

                return (
                  <View key={template.id} style={[styles.card, { shadowColor: colors.primary }]}>
                    <Pressable
                      disabled={!canEditDay}
                      onPress={() => onEditShiftDay?.(template, date)}
                    >
                      <Text style={styles.shiftName}>{template.name}</Text>
                      <Text style={styles.shiftTime}>
                        {displayStart} - {displayEnd}
                        {hasTimeOverride ? ' ✎' : ''}
                      </Text>
                    </Pressable>

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
                              const employeeColor = employee?.color ?? colors.textMuted;
                              return (
                                <Pressable
                                  key={a.id}
                                  onPress={() => onAssignmentPress(a, template)}
                                  style={[styles.employeeChip, { backgroundColor: employeeColor, shadowColor: employeeColor }]}
                                >
                                  <Text
                                    style={[
                                      styles.employeeChipText,
                                      { color: getContrastTextColor(employeeColor) },
                                    ]}
                                  >
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
    borderRadius: 14,
    padding: 8,
    marginBottom: 8,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 4,
  },
  // Colore fisso (non colors.text/textMuted): la card sotto resta sempre bianca a prescindere
  // dal tema, quindi anche il testo qui sopra deve restare sempre leggibile su bianco, anche se
  // il colore testo personale scelto altrove nell'app è bianco.
  shiftName: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
    textAlign: 'center',
  },
  shiftTime: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
    textAlign: 'center',
  },
  roleBlock: {
    marginBottom: 2,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  employeeChip: {
    borderRadius: 9,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginRight: 4,
    marginBottom: 4,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 2,
  },
  employeeChipText: {
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
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
    textAlign: 'center',
  },
});
