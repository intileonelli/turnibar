import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { ScreenContainer } from '@/src/components/shared/ScreenContainer';
import { TextField } from '@/src/components/shared/TextField';
import { Chip } from '@/src/components/shared/Chip';
import { Button } from '@/src/components/shared/Button';
import { SwitchRow } from '@/src/components/shared/SwitchRow';
import { Card } from '@/src/components/shared/Card';
import { ColorWheelPicker } from '@/src/components/shared/ColorWheelPicker';
import { colors } from '@/src/components/shared/colors';
import { useRoles } from '@/src/hooks/useRoles';
import { useShiftTemplates } from '@/src/hooks/useShiftTemplates';
import { useShiftCategories } from '@/src/hooks/useShiftCategories';
import { employeeRepository, unavailabilityRepository } from '@/src/db/repositories';
import { confirmAction, showAlert } from '@/src/utils/alert';
import { normalizeTime } from '@/src/utils/date';
import { timeToMinutes } from '@/src/engine';
import {
  Employee,
  EMPLOYEE_PRIORITY_LABELS,
  EmployeePriority,
  Unavailability,
  WEEKDAY_LABELS,
  Weekday,
  WEEKDAYS,
} from '@/src/models';
import { strings } from '@/src/i18n/strings';

const PRIORITIES: EmployeePriority[] = ['alta', 'normale', 'bassa'];

export default function EditEmployeeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { roles } = useRoles();
  const { shiftTemplates } = useShiftTemplates();
  const { categories } = useShiftCategories();

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [unavailabilities, setUnavailabilities] = useState<Unavailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [employeeColor, setEmployeeColor] = useState('#4F46E5');
  const [roleId, setRoleId] = useState<string | null>(null);
  const [secondaryRoleId, setSecondaryRoleId] = useState<string | null>(null);
  const [weeklyContractHours, setWeeklyContractHours] = useState('');
  const [maxWeeklyHours, setMaxWeeklyHours] = useState('');
  const [maxWeeklyShifts, setMaxWeeklyShifts] = useState('');
  const [maxWeeklyDays, setMaxWeeklyDays] = useState('');
  const [preferredWeekdays, setPreferredWeekdays] = useState<Set<Weekday>>(new Set());
  const [preferredCategoryId, setPreferredCategoryId] = useState<string | null>(null);
  const [pinnedShiftTemplateIds, setPinnedShiftTemplateIds] = useState<Set<string>>(new Set());
  const [maxByCategory, setMaxByCategory] = useState<Record<string, string>>({});
  const [priority, setPriority] = useState<EmployeePriority>('normale');
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
      setEmployeeColor(found.color);
      setRoleId(found.roleId);
      setSecondaryRoleId(found.secondaryRoleId ?? null);
      setWeeklyContractHours(found.weeklyContractHours !== undefined ? String(found.weeklyContractHours) : '');
      setMaxWeeklyHours(found.maxWeeklyHours !== undefined ? String(found.maxWeeklyHours) : '');
      setMaxWeeklyShifts(found.maxWeeklyShifts !== undefined ? String(found.maxWeeklyShifts) : '');
      setMaxWeeklyDays(found.maxWeeklyDays !== undefined ? String(found.maxWeeklyDays) : '');
      setPreferredWeekdays(new Set(found.preferredWeekdays ?? []));
      setPreferredCategoryId(found.preferredCategoryId ?? null);
      setPinnedShiftTemplateIds(new Set(found.pinnedShiftTemplateIds ?? []));
      const nextMaxByCategory: Record<string, string> = {};
      for (const [categoryId, value] of Object.entries(found.maxWeeklyShiftsByCategory ?? {})) {
        if (value !== undefined) nextMaxByCategory[categoryId] = String(value);
      }
      setMaxByCategory(nextMaxByCategory);
      setPriority(found.priority ?? 'normale');
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
    if (!employee || !roleId) return;

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
      await employeeRepository.updateEmployee({
        ...employee,
        name: name.trim(),
        color: employeeColor,
        roleId,
        secondaryRoleId: secondaryRoleId ?? undefined,
        weeklyContractHours: contractHours,
        maxWeeklyHours: maxHours,
        maxWeeklyShifts: maxWeeklyShifts ? Number(maxWeeklyShifts) : undefined,
        maxWeeklyDays: maxDays,
        preferredWeekdays: preferredWeekdays.size > 0 ? [...preferredWeekdays] : undefined,
        preferredCategoryId: preferredCategoryId ?? undefined,
        pinnedShiftTemplateIds: pinnedShiftTemplateIds.size > 0 ? [...pinnedShiftTemplateIds] : undefined,
        maxWeeklyShiftsByCategory:
          Object.keys(maxWeeklyShiftsByCategory).length > 0 ? maxWeeklyShiftsByCategory : undefined,
        priority,
        active,
      });
      router.back();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!employee) return;
    confirmAction(
      strings.employees.deleteConfirmTitle,
      strings.employees.deleteConfirmMessage,
      async () => {
        try {
          await employeeRepository.deleteEmployee(employee.id);
          router.back();
        } catch (err) {
          showAlert('Errore', err instanceof Error ? err.message : String(err));
        }
      },
      strings.common.delete,
      true
    );
  };

  const handleAddUnavailability = async () => {
    if (!employee) return;
    const normalizedStart = normalizeTime(newStart);
    const normalizedEnd = normalizeTime(newEnd);
    if (!normalizedStart || !normalizedEnd) {
      showAlert('Orario non valido', 'Inserisci gli orari nel formato HH:mm (es. 09:00).');
      return;
    }
    await unavailabilityRepository.createUnavailability({
      employeeId: employee.id,
      weekday: newWeekday,
      startTime: normalizedStart,
      endTime: normalizedEnd,
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

      <Text style={styles.label}>Colore</Text>
      <Text style={[styles.hint, styles.hintNoOffset]}>
        Usato per distinguere questo dipendente nel calendario turni.
      </Text>
      <View style={styles.colorPickerWrapper}>
        <ColorWheelPicker
          initialValue={employeeColor}
          onChange={setEmployeeColor}
          onChangeComplete={setEmployeeColor}
          size={160}
        />
      </View>

      <Text style={styles.label}>{strings.employees.role}</Text>
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
        <Text style={styles.muted}>Nessuna fascia oraria disponibile.</Text>
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
      <View style={styles.chipsRow}>
        <Chip label="Nessuna" selected={preferredCategoryId === null} onPress={() => setPreferredCategoryId(null)} />
        {categories.map((category) => (
          <Chip
            key={category.id}
            label={category.name}
            selected={preferredCategoryId === category.id}
            onPress={() => setPreferredCategoryId(category.id)}
          />
        ))}
      </View>

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
        <Text style={styles.muted}>{strings.employees.noPinnedShiftsAvailable}</Text>
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

      <SwitchRow label={strings.employees.active} value={active} onValueChange={setActive} />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Accesso all'app</Text>
        {employee.linkedUserId ? (
          <>
            <Text style={styles.muted}>Questo dipendente ha già collegato il proprio account.</Text>
            <Button
              label="Scollega account"
              variant="danger"
              onPress={() =>
                confirmAction(
                  'Scollegare l\'account?',
                  'Il dipendente dovrà chiedere al titolare un nuovo codice per ricollegarsi. Usalo solo se si è identificato per sbaglio.',
                  async () => {
                    await employeeRepository.updateEmployee({ ...employee, linkedUserId: undefined });
                    load();
                  },
                  'Scollega',
                  true
                )
              }
            />
          </>
        ) : (
          <Text style={styles.muted}>
            Nessun account collegato: questo dipendente può collegarsi registrandosi nell'app con
            il codice azienda (lo trovi in Negozio → Accessi dipendenti) e scegliendo il proprio
            nome dall'elenco.
          </Text>
        )}
      </View>

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
  hint: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: -12,
    marginBottom: 16,
  },
  hintNoOffset: {
    marginTop: 0,
    marginBottom: 16,
  },
  colorPickerWrapper: {
    marginBottom: 20,
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
