import { useCallback, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { ScreenContainer } from '@/src/components/shared/ScreenContainer';
import { TextField } from '@/src/components/shared/TextField';
import { Chip } from '@/src/components/shared/Chip';
import { Button } from '@/src/components/shared/Button';
import { SwitchRow } from '@/src/components/shared/SwitchRow';
import { Card } from '@/src/components/shared/Card';
import { colors } from '@/src/components/shared/colors';
import { useRoles } from '@/src/hooks/useRoles';
import { employeeRepository, unavailabilityRepository } from '@/src/db/repositories';
import {
  Employee,
  SHIFT_PREFERENCE_LABELS,
  ShiftPreference,
  Unavailability,
  WEEKDAY_LABELS,
  Weekday,
  WEEKDAYS,
} from '@/src/models';
import { strings } from '@/src/i18n/strings';

const PREFERENCES: ShiftPreference[] = ['nessuna', 'mattina', 'pomeriggio', 'sera'];

export default function EditEmployeeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { roles } = useRoles();

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [unavailabilities, setUnavailabilities] = useState<Unavailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [roleId, setRoleId] = useState<string | null>(null);
  const [weeklyContractHours, setWeeklyContractHours] = useState('0');
  const [maxWeeklyHours, setMaxWeeklyHours] = useState('0');
  const [maxWeeklyShifts, setMaxWeeklyShifts] = useState('');
  const [preference, setPreference] = useState<ShiftPreference>('nessuna');
  const [active, setActive] = useState(true);

  const [newWeekday, setNewWeekday] = useState<Weekday>(1);
  const [newStart, setNewStart] = useState('09:00');
  const [newEnd, setNewEnd] = useState('13:00');

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const [found, unav] = await Promise.all([
      employeeRepository.getEmployee(id),
      unavailabilityRepository.listUnavailabilitiesForEmployee(id),
    ]);
    if (found) {
      setEmployee(found);
      setName(found.name);
      setRoleId(found.roleId);
      setWeeklyContractHours(String(found.weeklyContractHours));
      setMaxWeeklyHours(String(found.maxWeeklyHours));
      setMaxWeeklyShifts(found.maxWeeklyShifts !== undefined ? String(found.maxWeeklyShifts) : '');
      setPreference(found.preference);
      setActive(found.active);
    }
    setUnavailabilities(unav);
    setLoading(false);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleSave = async () => {
    if (!employee || !roleId) return;
    const contractHours = Number(weeklyContractHours.replace(',', '.'));
    const maxHours = Number(maxWeeklyHours.replace(',', '.'));

    setSaving(true);
    try {
      await employeeRepository.updateEmployee({
        ...employee,
        name: name.trim(),
        roleId,
        weeklyContractHours: contractHours,
        maxWeeklyHours: maxHours,
        maxWeeklyShifts: maxWeeklyShifts ? Number(maxWeeklyShifts) : undefined,
        preference,
        active,
      });
      router.back();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!employee) return;
    Alert.alert(strings.employees.deleteConfirmTitle, strings.employees.deleteConfirmMessage, [
      { text: strings.common.cancel, style: 'cancel' },
      {
        text: strings.common.delete,
        style: 'destructive',
        onPress: async () => {
          await employeeRepository.deleteEmployee(employee.id);
          router.back();
        },
      },
    ]);
  };

  const handleAddUnavailability = async () => {
    if (!employee) return;
    await unavailabilityRepository.createUnavailability({
      employeeId: employee.id,
      weekday: newWeekday,
      startTime: newStart,
      endTime: newEnd,
    });
    load();
  };

  const handleDeleteUnavailability = async (unavailabilityId: string) => {
    await unavailabilityRepository.deleteUnavailability(unavailabilityId);
    load();
  };

  if (loading || !employee) {
    return (
      <ScreenContainer>
        <Text style={styles.loading}>{strings.common.loading}</Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <TextField label={strings.employees.name} value={name} onChangeText={setName} />

      <Text style={styles.label}>{strings.employees.role}</Text>
      <View style={styles.chipsRow}>
        {roles.map((role) => (
          <Chip
            key={role.id}
            label={role.name}
            color={role.color}
            selected={roleId === role.id}
            onPress={() => setRoleId(role.id)}
          />
        ))}
      </View>

      <TextField
        label={strings.employees.weeklyContractHours}
        value={weeklyContractHours}
        onChangeText={setWeeklyContractHours}
        keyboardType="numeric"
      />
      <TextField
        label={strings.employees.maxWeeklyHours}
        value={maxWeeklyHours}
        onChangeText={setMaxWeeklyHours}
        keyboardType="numeric"
      />
      <TextField
        label={strings.employees.maxWeeklyShifts}
        value={maxWeeklyShifts}
        onChangeText={setMaxWeeklyShifts}
        keyboardType="numeric"
        placeholder="Nessun limite"
      />

      <Text style={styles.label}>{strings.employees.preference}</Text>
      <View style={styles.chipsRow}>
        {PREFERENCES.map((pref) => (
          <Chip
            key={pref}
            label={SHIFT_PREFERENCE_LABELS[pref]}
            selected={preference === pref}
            onPress={() => setPreference(pref)}
          />
        ))}
      </View>

      <SwitchRow label={strings.employees.active} value={active} onValueChange={setActive} />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{strings.employees.unavailabilities}</Text>
        {unavailabilities.length === 0 && (
          <Text style={styles.muted}>{strings.employees.noUnavailabilities}</Text>
        )}
        {unavailabilities.map((u) => (
          <Card key={u.id}>
            <View style={styles.unavailabilityRow}>
              <Text style={styles.unavailabilityText}>
                {WEEKDAY_LABELS[u.weekday]} · {u.startTime} - {u.endTime}
              </Text>
              <Button label={strings.common.delete} variant="danger" onPress={() => handleDeleteUnavailability(u.id)} />
            </View>
          </Card>
        ))}

        <Text style={styles.label}>{strings.employees.unavailabilityWeekday}</Text>
        <View style={styles.chipsRow}>
          {WEEKDAYS.map((weekday) => (
            <Chip
              key={weekday}
              label={WEEKDAY_LABELS[weekday]}
              selected={newWeekday === weekday}
              onPress={() => setNewWeekday(weekday)}
            />
          ))}
        </View>
        <View style={styles.timeRow}>
          <View style={styles.timeField}>
            <TextField label={strings.employees.unavailabilityFrom} value={newStart} onChangeText={setNewStart} placeholder="09:00" />
          </View>
          <View style={styles.timeField}>
            <TextField label={strings.employees.unavailabilityTo} value={newEnd} onChangeText={setNewEnd} placeholder="13:00" />
          </View>
        </View>
        <Button label={strings.employees.addUnavailability} variant="secondary" onPress={handleAddUnavailability} />
      </View>

      <View style={styles.saveButton}>
        <Button label={strings.common.save} onPress={handleSave} loading={saving} />
      </View>
      <View style={styles.deleteButton}>
        <Button label={strings.common.delete} variant="danger" onPress={handleDelete} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  loading: {
    textAlign: 'center',
    color: colors.textMuted,
    marginTop: 32,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: 8,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  muted: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 12,
  },
  section: {
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  unavailabilityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  unavailabilityText: {
    fontSize: 14,
    color: colors.text,
    flexShrink: 1,
  },
  timeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  timeField: {
    flex: 1,
  },
  saveButton: {
    marginTop: 24,
  },
  deleteButton: {
    marginTop: 12,
    marginBottom: 24,
  },
});
