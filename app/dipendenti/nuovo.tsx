import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/src/components/shared/ScreenContainer';
import { TextField } from '@/src/components/shared/TextField';
import { Chip } from '@/src/components/shared/Chip';
import { Button } from '@/src/components/shared/Button';
import { colors } from '@/src/components/shared/colors';
import { showAlert } from '@/src/utils/alert';
import { timeToMinutes } from '@/src/engine';
import { useRoles } from '@/src/hooks/useRoles';
import { useShiftTemplates } from '@/src/hooks/useShiftTemplates';
import { employeeRepository } from '@/src/db/repositories';
import {
  Employee,
  SHIFT_PREFERENCE_LABELS,
  ShiftPreference,
  WEEKDAY_LABELS,
  Weekday,
  WEEKDAYS,
} from '@/src/models';
import { strings } from '@/src/i18n/strings';

const PREFERENCES: ShiftPreference[] = ['nessuna', 'mattina', 'pomeriggio', 'sera'];
const PREFERENCE_CATEGORIES: Exclude<ShiftPreference, 'nessuna'>[] = ['mattina', 'pomeriggio', 'sera'];

export default function NewEmployeeScreen() {
  const router = useRouter();
  const { roles } = useRoles();
  const { shiftTemplates } = useShiftTemplates();

  const [name, setName] = useState('');
  const [roleId, setRoleId] = useState<string | null>(null);
  const [secondaryRoleId, setSecondaryRoleId] = useState<string | null>(null);
  const [weeklyContractHours, setWeeklyContractHours] = useState('');
  const [maxWeeklyHours, setMaxWeeklyHours] = useState('');
  const [maxWeeklyShifts, setMaxWeeklyShifts] = useState('');
  const [maxWeeklyDays, setMaxWeeklyDays] = useState('');
  const [preferredWeekdays, setPreferredWeekdays] = useState<Set<Weekday>>(new Set());
  const [preference, setPreference] = useState<ShiftPreference>('nessuna');
  const [pinnedShiftTemplateIds, setPinnedShiftTemplateIds] = useState<Set<string>>(new Set());
  const [maxByPreference, setMaxByPreference] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const togglePreferredWeekday = (day: Weekday) => {
    setPreferredWeekdays((prev) => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
  };

  const togglePinnedShift = (id: string) => {
    setPinnedShiftTemplateIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectRole = (id: string) => {
    setRoleId(id);
    if (secondaryRoleId === id) setSecondaryRoleId(null);
  };

  const selectSecondaryRole = (id: string) => {
    setSecondaryRoleId((prev) => (prev === id ? null : id));
  };

  const handleSave = async () => {
    if (!name.trim()) {
      showAlert('Nome mancante', 'Inserisci il nome del dipendente.');
      return;
    }
    if (!roleId) {
      showAlert('Ruolo mancante', 'Seleziona un ruolo per il dipendente.');
      return;
    }

    let contractHours: number | undefined;
    if (weeklyContractHours.trim()) {
      contractHours = Number(weeklyContractHours.replace(',', '.'));
      if (!Number.isFinite(contractHours) || contractHours < 0) {
        showAlert('Ore non valide', 'Inserisci un numero valido di ore contrattuali, oppure lascia il campo vuoto.');
        return;
      }
    }

    let maxHours: number | undefined;
    if (maxWeeklyHours.trim()) {
      maxHours = Number(maxWeeklyHours.replace(',', '.'));
      if (!Number.isFinite(maxHours) || maxHours <= 0) {
        showAlert('Ore non valide', 'Inserisci un numero valido di ore massime settimanali, oppure lascia il campo vuoto per nessun limite.');
        return;
      }
    }

    let maxDays: number | undefined;
    if (maxWeeklyDays.trim()) {
      maxDays = Number(maxWeeklyDays);
      if (!Number.isInteger(maxDays) || maxDays <= 0) {
        showAlert('Giorni non validi', 'Inserisci un numero intero valido di giorni, oppure lascia il campo vuoto per nessun limite.');
        return;
      }
    }

    const maxWeeklyShiftsByPreference: Employee['maxWeeklyShiftsByPreference'] = {};
    for (const category of PREFERENCE_CATEGORIES) {
      const raw = maxByPreference[category];
      if (raw && raw.trim()) {
        const value = Number(raw);
        if (!Number.isInteger(value) || value <= 0) {
          showAlert('Valore non valido', `Inserisci un numero intero valido per il limite di ${category}, oppure lascia il campo vuoto.`);
          return;
        }
        maxWeeklyShiftsByPreference[category] = value;
      }
    }

    setSaving(true);
    try {
      await employeeRepository.createEmployee({
        name: name.trim(),
        roleId,
        secondaryRoleId: secondaryRoleId ?? undefined,
        weeklyContractHours: contractHours,
        maxWeeklyHours: maxHours,
        maxWeeklyShifts: maxWeeklyShifts ? Number(maxWeeklyShifts) : undefined,
        maxWeeklyDays: maxDays,
        preferredWeekdays: preferredWeekdays.size > 0 ? [...preferredWeekdays] : undefined,
        preference,
        pinnedShiftTemplateIds: pinnedShiftTemplateIds.size > 0 ? [...pinnedShiftTemplateIds] : undefined,
        maxWeeklyShiftsByPreference:
          Object.keys(maxWeeklyShiftsByPreference).length > 0 ? maxWeeklyShiftsByPreference : undefined,
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
              onPress={() => selectRole(role.id)}
            />
          ))}
        </View>
      )}

      {roles.length > 1 && (
        <>
          <Text style={styles.label}>{strings.employees.secondaryRole}</Text>
          <View style={styles.chipsRow}>
            {roles
              .filter((role) => role.id !== roleId)
              .map((role) => (
                <Chip
                  key={role.id}
                  label={role.name}
                  color={role.color}
                  selected={secondaryRoleId === role.id}
                  onPress={() => selectSecondaryRole(role.id)}
                />
              ))}
          </View>
        </>
      )}

      <TextField
        label={strings.employees.weeklyContractHours}
        value={weeklyContractHours}
        onChangeText={setWeeklyContractHours}
        keyboardType="numeric"
        placeholder="Non specificato"
      />
      <Text style={styles.hint}>{strings.employees.weeklyContractHoursHint}</Text>
      <TextField
        label={strings.employees.maxWeeklyHours}
        value={maxWeeklyHours}
        onChangeText={setMaxWeeklyHours}
        keyboardType="numeric"
        placeholder="Nessun limite"
      />
      <Text style={styles.hint}>{strings.employees.maxWeeklyHoursHint}</Text>
      <TextField
        label={strings.employees.maxWeeklyShifts}
        value={maxWeeklyShifts}
        onChangeText={setMaxWeeklyShifts}
        keyboardType="numeric"
        placeholder="Nessun limite"
      />
      <TextField
        label={strings.employees.maxWeeklyDays}
        value={maxWeeklyDays}
        onChangeText={setMaxWeeklyDays}
        keyboardType="numeric"
        placeholder="Nessun limite"
      />

      <Text style={styles.label}>{strings.employees.maxWeeklyShiftsByPreference}</Text>
      <Text style={styles.hint}>{strings.employees.maxWeeklyShiftsByPreferenceHint}</Text>
      <View style={styles.preferenceLimitsRow}>
        {PREFERENCE_CATEGORIES.map((category) => (
          <View key={category} style={styles.preferenceLimitField}>
            <TextField
              label={SHIFT_PREFERENCE_LABELS[category]}
              value={maxByPreference[category] ?? ''}
              onChangeText={(text) => setMaxByPreference((prev) => ({ ...prev, [category]: text }))}
              keyboardType="numeric"
              placeholder="Nessun limite"
            />
          </View>
        ))}
      </View>

      <Text style={styles.label}>{strings.employees.preferredWeekdays}</Text>
      <View style={styles.chipsRow}>
        {WEEKDAYS.map((day) => (
          <Chip
            key={day}
            label={WEEKDAY_LABELS[day]}
            selected={preferredWeekdays.has(day)}
            onPress={() => togglePreferredWeekday(day)}
          />
        ))}
      </View>

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

      <Text style={styles.label}>{strings.employees.pinnedShifts}</Text>
      <Text style={styles.hint}>{strings.employees.pinnedShiftsHint}</Text>
      {shiftTemplates.length === 0 ? (
        <Text style={styles.warning}>{strings.employees.noPinnedShiftsAvailable}</Text>
      ) : (
        WEEKDAYS.map((day) => {
          const templatesForDay = shiftTemplates
            .filter((t) => t.weekday === day)
            .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
          if (templatesForDay.length === 0) return null;
          return (
            <View key={day} style={styles.pinnedDaySection}>
              <Text style={styles.pinnedDayTitle}>{WEEKDAY_LABELS[day]}</Text>
              <View style={styles.chipsRow}>
                {templatesForDay.map((template) => (
                  <Chip
                    key={template.id}
                    label={`${template.name} · ${template.startTime}-${template.endTime}`}
                    selected={pinnedShiftTemplateIds.has(template.id)}
                    onPress={() => togglePinnedShift(template.id)}
                  />
                ))}
              </View>
            </View>
          );
        })
      )}

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
  hint: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: -12,
    marginBottom: 16,
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
  preferenceLimitsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  preferenceLimitField: {
    flex: 1,
  },
  pinnedDaySection: {
    marginBottom: 8,
  },
  pinnedDayTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  saveButton: {
    marginTop: 8,
  },
});
