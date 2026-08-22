import { FlatList, Text, View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/src/components/shared/ScreenContainer';
import { Button } from '@/src/components/shared/Button';
import { colors } from '@/src/components/shared/colors';
import { EmployeeCard } from '@/src/components/employee/EmployeeCard';
import { useEmployees } from '@/src/hooks/useEmployees';
import { useRoles } from '@/src/hooks/useRoles';
import { strings } from '@/src/i18n/strings';

export default function EmployeeListScreen() {
  const router = useRouter();
  const { employees, loading } = useEmployees({ includeInactive: true });
  const { roles } = useRoles();
  const roleById = new Map(roles.map((r) => [r.id, r]));

  return (
    <ScreenContainer scroll={false}>
      <View style={styles.header}>
        <Button label={strings.employees.newEmployee} onPress={() => router.push('/dipendenti/nuovo')} />
      </View>

      {!loading && employees.length === 0 && (
        <Text style={styles.empty}>{strings.employees.empty}</Text>
      )}

      <FlatList
        data={employees}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <EmployeeCard
            employee={item}
            role={roleById.get(item.roleId)}
            secondaryRole={item.secondaryRoleId ? roleById.get(item.secondaryRoleId) : undefined}
            onPress={() => router.push(`/dipendenti/${item.id}`)}
          />
        )}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: 12,
  },
  empty: {
    textAlign: 'center',
    color: colors.textMuted,
    marginTop: 32,
  },
});
