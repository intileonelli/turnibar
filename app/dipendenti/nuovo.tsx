import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/src/components/shared/ScreenContainer';
import { TextField } from '@/src/components/shared/TextField';
import { Chip } from '@/src/components/shared/Chip';
import { Button } from '@/src/components/shared/Button';
import { colors } from '@/src/components/shared/colors';
import { useRoles } from '@/src/hooks/useRoles';
import { employeeRepository } from '@/src/db/repositories';
import { SHIFT_PREFERENCE_LABELS, ShiftPreference } from '@/src/models';
import { strings } from '@/src/i18n/strings';

const PREFERENCES: ShiftPreference[] = ['nessuna', 'mattina', 'pomeriggio', 'sera'];

export default function NewEmployeeScreen() {
  const router = useRouter();
  const { roles } = useRoles();

  const [name, setName] = useState('');
  const [roleId, setRoleId] = useState<string | null>(null);
  const [weeklyContractHours, setWeeklyContractHours] = useState('20');
  const [maxWeeklyHours, setMaxWeeklyHours] = useState('20');
  const [maxWeeklyShifts, setMaxWeeklyShifts] = useState('');
  const [preference, setPreference] = useState<ShiftPreference>('nessuna');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Nome mancante', 'Inserisci il nome del dipendente.');
      return;
    }
    if (!roleId) {
      Alert.alert('Ruolo mancante', 'Seleziona un ruolo per il dipendente.');
      return;
    }
    const contractHours = Number(weeklyContractHours.replace(',', '.'));
    const maxHours = Number(maxWeeklyHours.replace(',', '.'));
    if (!Number.isFinite(contractHours) || contractHours < 0) {
      Alert.alert('Ore non valide', 'Inserisci un numero valido di ore contrattuali.');
      return;
    }
    if (!Number.isFinite(maxHours) || maxHours <= 0) {
      Alert.alert('Ore non valide', 'Inserisci un numero valido di ore massime settimanali.');
      return;
    }

    setSaving(true);
    try {
      await employeeRepository.createEmployee({
        name: name.trim(),
        roleId,
        weeklyContractHours: contractHours,
        maxWeeklyHours: maxHours,
        maxWeeklyShifts: maxWeeklyShifts ? Number(maxWeeklyShifts) : undefined,
        preference,
        active: true,
      });
      router.back();
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenContainer>
      <TextField label={strings.employees.name} value={name} onChangeText={setName} placeholder="Es. Anna Rossi" />

      <Text style={styles.label}>{strings.employees.role}</Text>
      {roles.length === 0 ? (
        <Text style={styles.warning}>
          Nessun ruolo disponibile. Crea prima un ruolo nella sezione Negozio → Ruoli.
        </Text>
      ) : (
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
      )}

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

      <View style={styles.saveButton}>
        <Button label={strings.common.save} onPress={handleSave} loading={saving} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
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
  warning: {
    fontSize: 13,
    color: colors.warning,
    marginBottom: 16,
  },
  saveButton: {
    marginTop: 8,
  },
});
