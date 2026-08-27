import { StyleSheet, Text, View } from 'react-native';
import { ShiftCategory } from '@/src/models';
import { Chip } from '@/src/components/shared/Chip';
import { Button } from '@/src/components/shared/Button';
import { colors } from '@/src/components/shared/colors';

interface PreferredCategoriesPickerProps {
  categories: ShiftCategory[];
  /** Id delle fasce preferite, in ordine di importanza (indice 0 = più importante). */
  value: string[];
  onChange: (ids: string[]) => void;
}

/**
 * Selezione di più fasce orarie preferite, in ordine di importanza: toccare una fascia la
 * aggiunge in fondo alla lista (o la toglie se già presente); le frecce spostano una fascia già
 * scelta su o giù per cambiarne l'ordine.
 */
export function PreferredCategoriesPicker({ categories, value, onChange }: PreferredCategoriesPickerProps) {
  const toggleCategory = (id: string) => {
    if (value.includes(id)) {
      onChange(value.filter((v) => v !== id));
    } else {
      onChange([...value, id]);
    }
  };

  const moveCategory = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= value.length) return;
    const next = [...value];
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    onChange(next);
  };

  const categoryName = (id: string) => categories.find((c) => c.id === id)?.name ?? id;

  return (
    <View>
      <View style={styles.chipsRow}>
        <Chip label="Nessuna" selected={value.length === 0} onPress={() => onChange([])} />
        {categories.map((category) => {
          const rank = value.indexOf(category.id);
          return (
            <Chip
              key={category.id}
              label={rank === -1 ? category.name : `${rank + 1}. ${category.name}`}
              selected={rank !== -1}
              onPress={() => toggleCategory(category.id)}
            />
          );
        })}
      </View>

      {value.length > 1 && (
        <View style={styles.orderList}>
          <Text style={styles.orderHint}>Ordine di importanza (la prima è la più importante):</Text>
          {value.map((id, index) => (
            <View key={id} style={styles.orderRow}>
              <Text style={styles.orderText}>
                {index + 1}. {categoryName(id)}
              </Text>
              <View style={styles.orderActions}>
                {index > 0 && (
                  <View style={styles.orderButton}>
                    <Button label="↑" variant="secondary" onPress={() => moveCategory(index, -1)} />
                  </View>
                )}
                {index < value.length - 1 && (
                  <View style={styles.orderButton}>
                    <Button label="↓" variant="secondary" onPress={() => moveCategory(index, 1)} />
                  </View>
                )}
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  orderList: {
    marginBottom: 16,
  },
  orderHint: {
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: 6,
  },
  orderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  orderText: {
    fontSize: 13,
    color: colors.text,
  },
  orderActions: {
    flexDirection: 'row',
    gap: 6,
  },
  orderButton: {
    width: 40,
  },
});
