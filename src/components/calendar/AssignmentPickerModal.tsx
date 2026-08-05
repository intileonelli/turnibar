import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  Employee,
  Role,
  ShiftAssignment,
  ShiftTemplate,
  TimeOff,
  Unavailability,
} from '@/src/models';
import { validateAssignment } from '@/src/engine';
import { Button } from '@/src/components/shared/Button';
import { Badge } from '@/src/components/shared/Badge';
import { colors } from '@/src/components/shared/colors';
import { strings } from '@/src/i18n/strings';

interface AssignmentPickerModalProps {
  visible: boolean;
  onClose: () => void;
  template: ShiftTemplate | null;
  date: string;
  roleId: string;
  employees: Employee[];
  roles: Role[];
  currentAssignmentId?: string;
  allAssignmentsThisWeek: ShiftAssignment[];
  shiftTemplates: ShiftTemplate[];
  unavailabilities: Unavailability[];
  timeOff: TimeOff[];
  onSelectEmployee: (employeeId: string) => void;
  onRemove?: () => void;
}

export function AssignmentPickerModal({
  visible,
  onClose,
  template,
  date,
  roleId,
  employees,
  roles,
  currentAssignmentId,
  allAssignmentsThisWeek,
  shiftTemplates,
  unavailabilities,
  timeOff,
  onSelectEmployee,
  onRemove,
}: AssignmentPickerModalProps) {
  if (!template) return null;

  const candidates = [...employees]
    .filter((e) => e.active)
    .sort((a, b) => {
      if (a.roleId === roleId && b.roleId !== roleId) return -1;
      if (a.roleId !== roleId && b.roleId === roleId) return 1;
      return a.name.localeCompare(b.name);
    });

  const roleName = (id: string) => roles.find((r) => r.id === id)?.name ?? id;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>
            {template.name} · {template.startTime}-{template.endTime}
          </Text>
          <Text style={styles.subtitle}>{strings.calendar.selectEmployee}</Text>

          <FlatList
            data={candidates}
            keyExtractor={(item) => item.id}
            style={styles.list}
            renderItem={({ item }) => {
              const otherAssignments = allAssignmentsThisWeek
                .filter((a) => a.employeeId === item.id && a.id !== currentAssignmentId)
                .map((a) => {
                  const t = shiftTemplates.find((st) => st.id === a.shiftTemplateId);
                  return { date: a.date, startTime: t?.startTime ?? '00:00', endTime: t?.endTime ?? '00:00' };
                });

              const violations = validateAssignment({
                employee: item,
                slot: {
                  shiftTemplateId: template.id,
                  shiftName: template.name,
                  date,
                  weekday: template.weekday,
                  startTime: template.startTime,
                  endTime: template.endTime,
                  roleId,
                },
                otherAssignmentsForEmployee: otherAssignments,
                unavailabilities,
                timeOff,
              });
              const hardViolations = violations.filter((v) => v.severity === 'hard');
              const softViolations = violations.filter((v) => v.severity === 'soft');

              return (
                <Pressable style={styles.row} onPress={() => onSelectEmployee(item.id)}>
                  <View style={styles.rowInfo}>
                    <Text style={styles.rowName}>{item.name}</Text>
                    <Text style={styles.rowRole}>{roleName(item.roleId)}</Text>
                    {violations.length > 0 && (
                      <View style={styles.violationsRow}>
                        {hardViolations.map((v, i) => (
                          <Badge key={`h-${i}`} label={v.message} tone="danger" />
                        ))}
                        {softViolations.map((v, i) => (
                          <Badge key={`s-${i}`} label={v.message} tone="warning" />
                        ))}
                      </View>
                    )}
                    {violations.length === 0 && <Badge label="Nessuna violazione" tone="success" />}
                  </View>
                </Pressable>
              );
            }}
          />

          <View style={styles.actions}>
            {onRemove && (
              <View style={styles.actionButton}>
                <Button label={strings.common.delete} variant="danger" onPress={onRemove} />
              </View>
            )}
            <View style={styles.actionButton}>
              <Button label={strings.common.close} variant="secondary" onPress={onClose} />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    maxHeight: '80%',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 12,
  },
  list: {
    maxHeight: 380,
  },
  row: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    marginBottom: 8,
  },
  rowInfo: {
    gap: 4,
  },
  rowName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  rowRole: {
    fontSize: 12,
    color: colors.textMuted,
  },
  violationsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
  },
});
