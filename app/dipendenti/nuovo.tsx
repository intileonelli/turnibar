import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/src/components/shared/ScreenContainer';
import { TextField } from '@/src/components/shared/TextField';
import { Chip } from '@/src/components/shared/Chip';
import { Button } from '@/src/components/shared/Button';
import { PreferredCategoriesPicker } from '@/src/components/employee/PreferredCategoriesPicker';
import { colors } from '@/src/components/shared/colors';
import { showAlert } from '@/src/utils/alert';
import { useRoles } from '@/src/hooks/useRoles';
import { useShiftTemplates } from '@/src/hooks/useShiftTemplates';
import { useShiftCategories } from '@/src/hooks/useShiftCategories';
import { employeeRepository } from '@/src/db/repositories';
import {
  Employee,
  EMPLOYEE_PRIORITY_LABELS,
  EmployeePriority,
  WEEKDAY_LABELS,
  Weekday,
  WEEKDAYS,
} from '@/src/models';
import { strings } from '@/src/i18n/strings';

const PRIORITIES: EmployeePriority[] = ['alta', 'normale', 'bassa'];

export default function NewEmployeeScreen() {
  const router = useRouter();
  const { roles } = useRoles();
  const { shiftTemplates } = useShiftTemplates();
  const { categories } = useShiftCategories();

  const [name, setName] = useState('');
  const [roleId, setRoleId] = useState<string | null>(null);
  const [secondaryRoleId, setSecondaryRoleId] = useState<string | null>(null);
  const [weeklyContractHours, setWeeklyContractHours] = useState('');
  const [maxWeeklyHours, setMaxWeeklyHours] = useState('');
  const [maxWeeklyShifts, setMaxWeeklyShifts] = useState('');
  const [maxWeeklyDays, setMaxWeeklyDays] = useState('');
  const [preferredWeekdays, setPreferredWeekdays] = useState<Set<Weekday>>(new Set());
  const [preferredCategoryIds, setPreferredCategoryIds] = useState<string[]>([]);
  const [pinnedShiftTemplateIds, setPinnedShiftTemplateIds] = useState<Set<string>>(new Set());
  const [maxByCategory, setMaxByCategory] = useState<Record<string, string>>({});
  const [priority, setPriority] = useState<EmployeePriority>('normale');
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

    const maxWeeklyShiftsByCategory: Employee['maxWeeklyShiftsByCategory'] = {};
    for (const category of categories) {
      const raw = maxByCategory[category.id];
      if (raw && raw.trim()) {
        const value = Number(raw);
        if (!Number.isInteger(value) || value <= 0) {
          showAlert('Valore non valido', `Inserisci un numero intero valido per il limite di ${category.name}, oppure lascia il campo vuoto.`);
          return;
        }
        maxWeeklyShiftsByCategory[category.id] = value;
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
        preferredCategoryIds: preferredCategoryIds.length > 0 ? preferredCategoryIds : undefined,
        pinnedShiftTemplateIds: pinnedShiftTemplateIds.size > 0 ? [...pinnedShiftTemplateIds] : undefined,
        maxWeeklyShiftsByCategory:
          Object.keys(maxWeeklyShiftsByCategory).length > 0 ? maxWeeklyShiftsByCategory : undefined,
        priority,
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
      {categories.length === 0 ? (
        <Text style={styles.warning}>Nessuna fascia oraria disponibile.</Text>
      ) : (
        <View style={styles.preferenceLimitsRow}>
          {categories.map((category) => (
            <View key={category.id} style={styles.preferenceLimitField}>
              <TextField
                label={category.name}
                value={maxByCategory[category.id] ?? ''}
                onChangeText={(text) => setMaxByCategory((prev) => ({ ...prev, [category.id]: text }))}
                keyboardType="numeric"
                placeholder="Nessun limite"
              />
            </View>
          ))}
        </View>
      )}

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
      <Text style={[styles.hint, styles.hintNoOffset]}>
        Puoi scegliere più fasce: la prima toccata è la più importante.
      </Text>
      <PreferredCategoriesPicker categories={categories} value={preferredCategoryIds} onChange={setPreferredCategoryIds} />

      <Text style={styles.label}>Priorità nella generazione turni</Text>
      <Text style={styles.hint}>
        "Alta" viene preferito, "Bassa" viene usato solo se serve davvero.
      </Text>
      <View style={styles.chipsRow}>
        {PRIORITIES.map((p) => (
          <Chip
            key={p}
            label={EMPLOYEE_PRIORITY_LABELS[p]}
            selected={priority === p}
            onPress={() => setPriority(p)}
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
            .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
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
  hintNoOffset: {
    marginTop: 0,
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
