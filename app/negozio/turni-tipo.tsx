import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ScreenContainer } from '@/src/components/shared/ScreenContainer';
import { TextField } from '@/src/components/shared/TextField';
import { Chip } from '@/src/components/shared/Chip';
import { Button } from '@/src/components/shared/Button';
import { Card } from '@/src/components/shared/Card';
import { colors } from '@/src/components/shared/colors';
import { useShiftTemplates } from '@/src/hooks/useShiftTemplates';
import { useRoles } from '@/src/hooks/useRoles';
import { shiftTemplateRepository } from '@/src/db/repositories';
import { timeToMinutes } from '@/src/engine';
import { confirmAction, showAlert } from '@/src/utils/alert';
import { normalizeTime } from '@/src/utils/date';
import { RoleRequirement, ShiftTemplate, WEEKDAY_LABELS, Weekday, WEEKDAYS } from '@/src/models';
import { strings } from '@/src/i18n/strings';

function emptyGroup(): RoleRequirement {
  return { roleIds: [], count: 1 };
}

export default function ShiftTemplatesScreen() {
  const { shiftTemplates, reload } = useShiftTemplates();
  const { roles } = useRoles();
  const scrollRef = useRef<ScrollView>(null);
  const formTitleRef = useRef<View>(null);
  const scrollOffsetRef = useRef(0);

  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [weekday, setWeekday] = useState<Weekday>(1);
  const [name, setName] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('13:00');
  const [requirementGroups, setRequirementGroups] = useState<RoleRequirement[]>([emptyGroup()]);
  const [saving, setSaving] = useState(false);

  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [duplicateTargets, setDuplicateTargets] = useState<Set<Weekday>>(new Set());
  const [duplicating, setDuplicating] = useState(false);

  const roleById = new Map(roles.map((r) => [r.id, r]));

  const resetForm = () => {
    setEditingTemplateId(null);
    setName('');
    setStartTime('09:00');
    setEndTime('13:00');
    setRequirementGroups([emptyGroup()]);
  };

  const scrollToForm = () => {
    const scrollNode = scrollRef.current;
    const titleNode = formTitleRef.current;
    if (!scrollNode || !titleNode) return;
    // Misura la posizione attuale del titolo del modulo rispetto alla pagina, invece di
    // affidarsi a un valore salvato tramite onLayout: su react-native-web onLayout usa un
    // ResizeObserver che rileva solo cambi di dimensione dell'elemento osservato, non gli
    // spostamenti dovuti al contenuto sopra di lui (es. turni tipo caricati dopo il primo render).
    // Usa measure() invece di measureLayout()/findNodeHandle: quest'ultimo non è supportato su web.
    titleNode.measure((_x: number, _y: number, _width: number, _height: number, _pageX: number, titlePageY: number) => {
      (scrollNode as unknown as View).measure(
        (_sx: number, _sy: number, _swidth: number, _sheight: number, _spageX: number, scrollPageY: number) => {
          const target = scrollOffsetRef.current + (titlePageY - scrollPageY) - 12;
          scrollNode.scrollTo({ y: Math.max(target, 0), animated: true });
        }
      );
    });
  };

  const startEdit = (template: ShiftTemplate) => {
    setEditingTemplateId(template.id);
    setWeekday(template.weekday);
    setName(template.name);
    setStartTime(template.startTime);
    setEndTime(template.endTime);
    setRequirementGroups(template.requirements.map((r) => ({ roleIds: [...r.roleIds], count: r.count })));
    // Aspetta due frame: il primo lascia commettere il nuovo render (nuovi valori nei campi),
    // il secondo garantisce che il layout sia stato ricalcolato prima di misurare la posizione.
    requestAnimationFrame(() => {
      requestAnimationFrame(scrollToForm);
    });
  };

  const addGroup = () => {
    setRequirementGroups((prev) => [...prev, emptyGroup()]);
  };

  const removeGroup = (index: number) => {
    setRequirementGroups((prev) => prev.filter((_, i) => i !== index));
  };

  const updateGroupCount = (index: number, delta: number) => {
    setRequirementGroups((prev) =>
      prev.map((g, i) => (i === index ? { ...g, count: Math.max(1, g.count + delta) } : g))
    );
  };

  const toggleGroupRole = (index: number, roleId: string) => {
    setRequirementGroups((prev) =>
      prev.map((g, i) => {
        if (i !== index) return g;
        const has = g.roleIds.includes(roleId);
        return { ...g, roleIds: has ? g.roleIds.filter((id) => id !== roleId) : [...g.roleIds, roleId] };
      })
    );
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;
    const requirements = requirementGroups.filter((g) => g.roleIds.length > 0 && g.count > 0);
    if (requirements.length === 0) return;

    const normalizedStart = normalizeTime(startTime);
    const normalizedEnd = normalizeTime(endTime);
    if (!normalizedStart || !normalizedEnd) {
      showAlert(
        'Orario non valido',
        'Inserisci gli orari nel formato HH:mm (es. 06:30), con ore da 0 a 23 e minuti da 0 a 59.'
      );
      return;
    }

    setSaving(true);
    try {
      if (editingTemplateId) {
        await shiftTemplateRepository.updateShiftTemplate({
          id: editingTemplateId,
          weekday,
          name: name.trim(),
          startTime: normalizedStart,
          endTime: normalizedEnd,
          requirements,
        });
      } else {
        await shiftTemplateRepository.createShiftTemplate({
          weekday,
          name: name.trim(),
          startTime: normalizedStart,
          endTime: normalizedEnd,
          requirements,
        });
      }
      resetForm();
      await reload();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (editingTemplateId === id) resetForm();
    await shiftTemplateRepository.deleteShiftTemplate(id);
    await reload();
  };

  const handleDeleteAllForDay = (day: Weekday) => {
    confirmAction(
      `Eliminare tutti i turni di ${WEEKDAY_LABELS[day]}?`,
      'Questa azione non può essere annullata.',
      async () => {
        if (editingTemplateId) {
          const editing = shiftTemplates.find((t) => t.id === editingTemplateId);
          if (editing?.weekday === day) resetForm();
        }
        await shiftTemplateRepository.deleteShiftTemplatesForWeekday(day);
        await reload();
      },
      strings.common.delete,
      true
    );
  };

  const startDuplicate = (template: ShiftTemplate) => {
    setDuplicatingId(template.id);
    setDuplicateTargets(new Set());
  };

  const toggleDuplicateTarget = (day: Weekday) => {
    setDuplicateTargets((prev) => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
  };

  const confirmDuplicate = async (template: ShiftTemplate) => {
    if (duplicateTargets.size === 0) return;
    setDuplicating(true);
    try {
      for (const day of duplicateTargets) {
        await shiftTemplateRepository.createShiftTemplate({
          weekday: day,
          name: template.name,
          startTime: template.startTime,
          endTime: template.endTime,
          requirements: template.requirements,
        });
      }
      setDuplicatingId(null);
      setDuplicateTargets(new Set());
      await reload();
    } finally {
      setDuplicating(false);
    }
  };

  const requirementSummary = (req: RoleRequirement) =>
    `${req.roleIds.map((id) => roleById.get(id)?.name ?? id).join(' → ')} x${req.count}`;

  return (
    <ScreenContainer
      ref={scrollRef}
      onScroll={(e) => {
        scrollOffsetRef.current = e.nativeEvent.contentOffset.y;
      }}
      scrollEventThrottle={16}
    >
      {WEEKDAYS.map((day) => {
        const templatesForDay = shiftTemplates
          .filter((t) => t.weekday === day)
          .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
        return (
          <View key={day} style={styles.daySection}>
            <View style={styles.dayTitleRow}>
              <Text style={styles.dayTitle}>{WEEKDAY_LABELS[day]}</Text>
              {templatesForDay.length > 0 && (
                <Pressable onPress={() => handleDeleteAllForDay(day)}>
                  <Text style={styles.deleteAllLink}>Elimina tutti</Text>
                </Pressable>
              )}
            </View>
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
                      {template.requirements.map(requirementSummary).join(', ')}
                    </Text>
                  </View>
                </View>
                <View style={styles.templateActions}>
                  <View style={styles.templateActionButton}>
                    <Button label="Modifica" variant="secondary" onPress={() => startEdit(template)} />
                  </View>
                  <View style={styles.templateActionButton}>
                    <Button label="Duplica" variant="secondary" onPress={() => startDuplicate(template)} />
                  </View>
                  <View style={styles.templateActionButton}>
                    <Button label={strings.common.delete} variant="danger" onPress={() => handleDelete(template.id)} />
                  </View>
                </View>

                {duplicatingId === template.id && (
                  <View style={styles.duplicatePanel}>
                    <Text style={styles.duplicateLabel}>Copia questo turno anche su:</Text>
                    <View style={styles.chipsRow}>
                      {WEEKDAYS.filter((d) => d !== template.weekday).map((d) => (
                        <Chip
                          key={d}
                          label={WEEKDAY_LABELS[d]}
                          selected={duplicateTargets.has(d)}
                          onPress={() => toggleDuplicateTarget(d)}
                        />
                      ))}
                    </View>
                    <View style={styles.duplicateActionsRow}>
                      <View style={styles.templateActionButton}>
                        <Button
                          label={strings.common.cancel}
                          variant="secondary"
                          onPress={() => setDuplicatingId(null)}
                        />
                      </View>
                      <View style={styles.templateActionButton}>
                        <Button
                          label="Copia"
                          onPress={() => confirmDuplicate(template)}
                          loading={duplicating}
                          disabled={duplicateTargets.size === 0}
                        />
                      </View>
                    </View>
                  </View>
                )}
              </Card>
            ))}
          </View>
        );
      })}

      <View ref={formTitleRef} collapsable={false}>
        <Text style={styles.sectionTitle}>
          {editingTemplateId ? 'Modifica turno tipo' : strings.shop.newShiftTemplate}
        </Text>
      </View>

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

      {requirementGroups.map((group, index) => (
        <View key={index} style={styles.requirementGroup}>
          <View style={styles.requirementGroupHeader}>
            <Text style={styles.requirementGroupTitle}>Requisito {index + 1}</Text>
            <View style={styles.stepper}>
              <Pressable style={styles.stepperButton} onPress={() => updateGroupCount(index, -1)}>
                <Text style={styles.stepperButtonText}>−</Text>
              </Pressable>
              <Text style={styles.stepperValue}>{group.count}</Text>
              <Pressable style={styles.stepperButton} onPress={() => updateGroupCount(index, 1)}>
                <Text style={styles.stepperButtonText}>+</Text>
              </Pressable>
            </View>
            {requirementGroups.length > 1 && (
              <Pressable onPress={() => removeGroup(index)} style={styles.removeGroupButton}>
                <Text style={styles.removeGroupButtonText}>✕</Text>
              </Pressable>
            )}
          </View>
          <Text style={styles.requirementHint}>
            Tocca i ruoli in ordine di preferenza: il primo scelto è il ruolo principale, gli altri sono
            alternative usate solo se il principale non è disponibile.
          </Text>
          <View style={styles.chipsRow}>
            {roles.map((role) => {
              const priority = group.roleIds.indexOf(role.id);
              const label = priority === -1 ? role.name : `${priority + 1}. ${role.name}`;
              return (
                <Chip
                  key={role.id}
                  label={label}
                  color={role.color}
                  selected={priority !== -1}
                  onPress={() => toggleGroupRole(index, role.id)}
                />
              );
            })}
          </View>
        </View>
      ))}

      <View style={styles.addGroupButton}>
        <Button label={strings.shop.addRequirement} variant="secondary" onPress={addGroup} />
      </View>

      <View style={styles.formActionsRow}>
        {editingTemplateId && (
          <View style={styles.templateActionButton}>
            <Button label={strings.common.cancel} variant="secondary" onPress={resetForm} />
          </View>
        )}
        <View style={styles.formSubmitButton}>
          <Button
            label={editingTemplateId ? strings.common.save : strings.common.add}
            onPress={handleSubmit}
            loading={saving}
          />
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  daySection: {
    marginBottom: 12,
  },
  dayTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dayTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  deleteAllLink: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.danger,
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
  templateActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  templateActionButton: {
    flex: 1,
  },
  duplicatePanel: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  duplicateLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: 8,
  },
  duplicateActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
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
  requirementGroup: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  requirementGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  requirementGroupTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  requirementHint: {
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: 8,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepperButton: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  stepperValue: {
    width: 28,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  removeGroupButton: {
    marginLeft: 10,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.dangerMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeGroupButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.danger,
  },
  addGroupButton: {
    marginBottom: 20,
  },
  formActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  formSubmitButton: {
    flex: 2,
  },
});
