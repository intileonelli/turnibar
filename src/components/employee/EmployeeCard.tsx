import { StyleSheet, Text, View } from 'react-native';
import { Employee, Role, SHIFT_PREFERENCE_LABELS } from '@/src/models';
import { Card } from '@/src/components/shared/Card';
import { Badge } from '@/src/components/shared/Badge';
import { colors } from '@/src/components/shared/colors';

interface EmployeeCardProps {
  employee: Employee;
  role?: Role;
  onPress: () => void;
}

export function EmployeeCard({ employee, role, onPress }: EmployeeCardProps) {
  return (
    <Card onPress={onPress}>
      <View style={styles.headerRow}>
        <Text style={styles.name}>{employee.name}</Text>
        {!employee.active && <Badge label="Non attivo" tone="warning" />}
      </View>
      {role && <Badge label={role.name} tone="default" />}
      <Text style={styles.details}>
        {employee.weeklyContractHours}h contrattuali · max {employee.maxWeeklyHours}h
        {employee.maxWeeklyShifts ? ` · max ${employee.maxWeeklyShifts} turni` : ''}
      </Text>
      <Text style={styles.details}>Preferenza: {SHIFT_PREFERENCE_LABELS[employee.preference]}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  details: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 4,
  },
});
