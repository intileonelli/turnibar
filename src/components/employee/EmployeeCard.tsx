import { StyleSheet, Text, View } from 'react-native';
import { Employee, Role, WEEKDAY_LABELS_SHORT } from '@/src/models';
import { Card } from '@/src/components/shared/Card';
import { Badge } from '@/src/components/shared/Badge';
import { colors } from '@/src/components/shared/colors';

interface EmployeeCardProps {
  employee: Employee;
  role?: Role;
  secondaryRole?: Role;
  preferredCategoryName?: string;
  onPress: () => void;
}

export function EmployeeCard({ employee, role, secondaryRole, preferredCategoryName, onPress }: EmployeeCardProps) {
  const hoursParts: string[] = [];
  if (employee.weeklyContractHours !== undefined) hoursParts.push(`${employee.weeklyContractHours}h contrattuali`);
  if (employee.maxWeeklyHours !== undefined) hoursParts.push(`max ${employee.maxWeeklyHours}h`);
  if (employee.maxWeeklyShifts !== undefined) hoursParts.push(`max ${employee.maxWeeklyShifts} turni`);
  if (employee.maxWeeklyDays !== undefined) hoursParts.push(`max ${employee.maxWeeklyDays} giorni`);

  return (
    <Card onPress={onPress}>
      <View style={styles.headerRow}>
        <Text style={styles.name}>{employee.name}</Text>
        {!employee.active && <Badge label="Non attivo" tone="warning" />}
      </View>
      <View style={styles.rolesRow}>
        {role && <Badge label={role.name} tone="default" />}
        {secondaryRole && <Badge label={`+ ${secondaryRole.name}`} tone="default" />}
      </View>
      <Text style={styles.details}>
        {hoursParts.length > 0 ? hoursParts.join(' · ') : 'Nessun limite di ore/turni/giorni'}
      </Text>
      <Text style={styles.details}>Preferenza: {preferredCategoryName ?? 'Nessuna'}</Text>
      {employee.preferredWeekdays && employee.preferredWeekdays.length > 0 && (
        <Text style={styles.details}>
          Giorni preferiti: {employee.preferredWeekdays.map((d) => WEEKDAY_LABELS_SHORT[d]).join(', ')}
        </Text>
      )}
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
  rolesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  details: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 4,
  },
});
