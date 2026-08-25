import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ScreenContainer } from '@/src/components/shared/ScreenContainer';
import { TextField } from '@/src/components/shared/TextField';
import { Button } from '@/src/components/shared/Button';
import { Card } from '@/src/components/shared/Card';
import { colors } from '@/src/components/shared/colors';
import { useShiftCategories } from '@/src/hooks/useShiftCategories';
import { shiftCategoryRepository } from '@/src/db/repositories';
import { confirmAction } from '@/src/utils/alert';
import { strings } from '@/src/i18n/strings';

export default function ShiftCategoriesScreen() {
  const { categories, reload } = useShiftCategories();
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setEditingCategoryId(null);
    setName('');
  };

  const startEdit = (categoryId: string) => {
    const category = categories.find((c) => c.id === categoryId);
    if (!category) return;
    setEditingCategoryId(categoryId);
    setName(category.name);
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      if (editingCategoryId) {
        const category = categories.find((c) => c.id === editingCategoryId);
        if (category) {
          await shiftCategoryRepository.updateShiftCategory({ ...category, name: name.trim() });
        }
      } else {
        const nextSortOrder = categories.length > 0 ? Math.max(...categories.map((c) => c.sortOrder)) + 1 : 0;
        await shiftCategoryRepository.createShiftCategory({ name: name.trim(), sortOrder: nextSortOrder });
      }
      resetForm();
      await reload();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: string) => {
    confirmAction(
      'Eliminare la fascia oraria?',
      'I turni tipo e le preferenze dipendenti collegati a questa fascia dovranno essere aggiornati manualmente.',
      async () => {
        if (editingCategoryId === id) resetForm();
        await shiftCategoryRepository.deleteShiftCategory(id);
        await reload();
      },
      strings.common.delete,
      true
    );
  };

  const moveCategory = async (id: string, direction: -1 | 1) => {
    const sorted = [...categories].sort((a, b) => a.sortOrder - b.sortOrder);
    const index = sorted.findIndex((c) => c.id === id);
    const targetIndex = index + direction;
    if (index === -1 || targetIndex < 0 || targetIndex >= sorted.length) return;
    const current = sorted[index];
    const target = sorted[targetIndex];
    await Promise.all([
      shiftCategoryRepository.updateShiftCategory({ ...current, sortOrder: target.sortOrder }),
      shiftCategoryRepository.updateShiftCategory({ ...target, sortOrder: current.sortOrder }),
    ]);
    await reload();
  };

  return (
    <ScreenContainer>
      <Text style={styles.hint}>
        Le fasce orarie sono le categorie generali dei tuoi turni (es. Apertura, Mattina, Pomeriggio, Sera).
        Ogni turno tipo appartiene a una fascia, e i dipendenti possono indicare quale preferiscono.
      </Text>

      {categories.length === 0 && <Text style={styles.empty}>Nessuna fascia oraria creata.</Text>}

      {[...categories]
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((category, index) => (
          <Card key={category.id}>
            <View style={styles.row}>
              <Text style={styles.name}>{category.name}</Text>
              <View style={styles.actions}>
                <Pressable
                  style={[
                    styles.orderButton,
                    { backgroundColor: colors.primaryMuted },
                    index === 0 && styles.orderButtonDisabled,
                  ]}
                  disabled={index === 0}
                  onPress={() => moveCategory(category.id, -1)}
                >
                  <Text style={[styles.orderButtonText, { color: colors.primary }]}>↑</Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.orderButton,
                    { backgroundColor: colors.primaryMuted },
                    index === categories.length - 1 && styles.orderButtonDisabled,
                  ]}
                  disabled={index === categories.length - 1}
                  onPress={() => moveCategory(category.id, 1)}
                >
                  <Text style={[styles.orderButtonText, { color: colors.primary }]}>↓</Text>
                </Pressable>
                <View style={styles.actionButton}>
                  <Button label="Modifica" variant="secondary" onPress={() => startEdit(category.id)} />
                </View>
                <View style={styles.actionButton}>
                  <Button label={strings.common.delete} variant="danger" onPress={() => handleDelete(category.id)} />
                </View>
              </View>
            </View>
          </Card>
        ))}

      <Text style={styles.sectionTitle}>{editingCategoryId ? 'Modifica fascia oraria' : 'Nuova fascia oraria'}</Text>
      <TextField label="Nome" value={name} onChangeText={setName} placeholder="Es. Apertura" />

      <View style={styles.formActionsRow}>
        {editingCategoryId && (
          <View style={styles.actionButton}>
            <Button label={strings.common.cancel} variant="secondary" onPress={resetForm} />
          </View>
        )}
        <View style={styles.formSubmitButton}>
          <Button
            label={editingCategoryId ? strings.common.save : strings.common.add}
            onPress={handleSubmit}
            loading={saving}
          />
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  hint: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 16,
  },
  empty: {
    textAlign: 'center',
    color: colors.textMuted,
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    flexShrink: 1,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    minWidth: 0,
  },
  orderButton: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderButtonDisabled: {
    opacity: 0.3,
  },
  orderButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginTop: 16,
    marginBottom: 12,
  },
  formActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  formSubmitButton: {
    flex: 2,
  },
});
