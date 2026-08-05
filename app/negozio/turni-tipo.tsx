import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ScreenContainer } from '@/src/components/shared/ScreenContainer';
import { TextField } from '@/src/components/shared/TextField';
import { Chip } from '@/src/components/shared/Chip';
import { Button } from '@/src/components/shared/Button';
import { Card } from '@/src/components/shared/Card';
import { colors } from '@/src/components/shared/colors';
import { useShiftTemplates } from '@/src/hooks/useShiftTemplates';
import { useRoles } from '@/src/hooks/useRoles';
import { shiftTemplateRepository } from '@/src/db/repositories';
import { RoleRequirement, WEEKDAY_LABELS, Weekday, WEEKDAYS } from '@/src/models';
import { strings } from '@/src/i18n/strings';

export default function ShiftTemplatesScreen() {
  const { shiftTemplates, reload } = useShiftTemplates();
  const { roles } = useRoles();

  const [weekday, setWeekday] = useState<Weekday>(1);
  const [name, setName] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('13:00');
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);

  const setCount = (roleId: string, delta: number) => {
    setCounts((prev) => ({ ...prev, [roleId]: Math.max(0, (prev[roleId] ?? 0) + delta) }));
  };

  const handleAdd = async () => {
    if (!name.trim()) return;
    const requirements: RoleRequirement[] = Object.entries(counts)
      .filter(([, count]) => count > 0)
      .map(([roleId, count]) => ({ roleId, count }));
    if (requirements.length === 0) return;

    setSaving(true);
    try {
      await shiftTemplateRepository.createShiftTemplate({
        weekday,
        name: name.trim(),
        startTime,
        endTime,
        requirements,
      });
      setName('');
      setCounts({});
      await reload();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await shiftTemplateRepository.deleteShiftTemplate(id);
    await reload();
  };

  const roleById = new Map(roles.map((r) => [r.id, r]));

  return (
    <ScreenContainer>
      {WEEKDAYS.map((day) => {
        const templatesForDay = shiftTemplates.filter((t) => t.weekday === day);
        return (
          <View key={day} style={styles.daySection}>
            <Text style={styles.dayTitle}>{WEEKDAY_LABELS[day]}</Text>
            {templatesForDay.length === 0 && (
              <Text style={styles.muted}>{strings.shop.noShiftTemplates}</Text>
            )}
            {templatesForDay.map((template) => (
              <Card key={template.id}>
                <View style={styles.templateRow}>
                  <View style={styles.templateInfo}>
                    <Text style={styles.templateName}>
                      {template.name} · {template.startTime}-{template.endTime}
                    </Text>
                    <Text style={styles.templateRequirements}>
                      {template.requirements
                        .map((r) => `${roleById.get(r.roleId)?.name ?? r.roleId} x${r.count}`)
                        .join(', ')}
                    </Text>
                  </View>
                  <Button label={strings.common.delete} variant="danger" onPress={() => handleDelete(template.id)} />
                </View>
              </Card>
            ))}
          </View>
        );
      })}

      <Text style={styles.sectionTitle}>{strings.shop.newShiftTemplate}</Text>

      <Text style={styles.label}>Giorno</Text>
      <View style={styles.chipsRow}>
        {WEEKDAYS.map((day) => (
          <Chip key={day} label={WEEKDAY_LABELS[day]} selected={weekday === day} onPress={() => setWeekday(day)} />
        ))}
      </View>

      <TextField label={strings.shop.shiftName} value={name} onChangeText={setName} placeholder="Es. Mattina" />

      <View style={styles.timeRow}>
        <View style={styles.timeField}>
          <TextField label={strings.shop.startTime} value={startTime} onChangeText={setStartTime} placeholder="09:00" />
        </View>
        <View style={styles.timeField}>
          <TextField label={strings.shop.endTime} value={endTime} onChangeText={setEndTime} placeholder="13:00" />
        </View>
      </View>

      <Text style={styles.label}>{strings.shop.requirements}</Text>
      {roles.length === 0 && <Text style={styles.muted}>Crea prima almeno un ruolo.</Text>}
      {roles.map((role) => (
        <View key={role.id} style={styles.requirementRow}>
          <Text style={styles.requirementLabel}>{role.name}</Text>
          <View style={styles.stepper}>
            <Pressable style={styles.stepperButton} onPress={() => setCount(role.id, -1)}>
              <Text style={styles.stepperButtonText}>−</Text>
            </Pressable>
            <Text style={styles.stepperValue}>{counts[role.id] ?? 0}</Text>
            <Pressable style={styles.stepperButton} onPress={() => setCount(role.id, 1)}>
              <Text style={styles.stepperButtonText}>+</Text>
            </Pressable>
          </View>
        </View>
      ))}

      <View style={styles.addButton}>
        <Button label={strings.common.add} onPress={handleAdd} loading={saving} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  daySection: {
    marginBottom: 12,
  },
  dayTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  muted: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 8,
  },
  templateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  templateInfo: {
    flex: 1,
    marginRight: 8,
  },
  templateName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  templateRequirements: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginTop: 20,
    marginBottom: 12,
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
  timeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  timeField: {
    flex: 1,
  },
  requirementRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  requirementLabel: {
    fontSize: 14,
    color: colors.text,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepperButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
  stepperValue: {
    width: 32,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  addButton: {
    marginTop: 12,
    marginBottom: 24,
  },
});
