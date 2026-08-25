import { useEffect, useState } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { CategoryRequest, ShiftCategory, TimeOff } from '@/src/models';
import { Button } from '@/src/components/shared/Button';
import { Chip } from '@/src/components/shared/Chip';
import { TextField } from '@/src/components/shared/TextField';
import { colors } from '@/src/components/shared/colors';
import { formatDateLong, normalizeTime } from '@/src/utils/date';
import { showAlert } from '@/src/utils/alert';

type AbsenceMode = 'none' | 'full' | 'partial';

export interface DayAbsenceModalProps {
  visible: boolean;
  date: string | null;
  currentTimeOff?: TimeOff;
  currentCategoryRequest?: CategoryRequest;
  categories: ShiftCategory[];
  saving: boolean;
  onClose: () => void;
  onSave: (input: {
    absence: { mode: 'none' } | { mode: 'full' } | { mode: 'partial'; startTime: string; endTime: string };
    categoryId: string | null;
  }) => void;
}

export function DayAbsenceModal({
  visible,
  date,
  currentTimeOff,
  currentCategoryRequest,
  categories,
  saving,
  onClose,
  onSave,
}: DayAbsenceModalProps) {
  const [absenceMode, setAbsenceMode] = useState<AbsenceMode>('none');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('13:00');
  const [categoryId, setCategoryId] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    if (currentTimeOff) {
      if (currentTimeOff.startTime && currentTimeOff.endTime) {
        setAbsenceMode('partial');
        setStartTime(currentTimeOff.startTime);
        setEndTime(currentTimeOff.endTime);
      } else {
        setAbsenceMode('full');
      }
    } else {
      setAbsenceMode('none');
      setStartTime('09:00');
      setEndTime('13:00');
    }
    setCategoryId(currentCategoryRequest?.categoryId ?? null);
  }, [visible, currentTimeOff, currentCategoryRequest]);

  const selectFull = () => {
    setAbsenceMode('full');
    setCategoryId(null); // in ferie tutto il giorno non ha senso chiedere una fascia da lavorare
  };

  const handleSave = () => {
    if (absenceMode === 'partial') {
      const normalizedStart = normalizeTime(startTime);
      const normalizedEnd = normalizeTime(endTime);
      if (!normalizedStart || !normalizedEnd) {
        showAlert('Orario non valido', 'Inserisci gli orari nel formato HH:mm (es. 14:00).');
        return;
      }
      onSave({ absence: { mode: 'partial', startTime: normalizedStart, endTime: normalizedEnd }, categoryId });
      return;
    }
    onSave({ absence: { mode: absenceMode }, categoryId });
  };

  if (!date) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{formatDateLong(date)}</Text>

          <Text style={styles.sectionLabel}>Assenza</Text>
          <View style={styles.chipsRow}>
            <Chip label="Nessuna" selected={absenceMode === 'none'} onPress={() => setAbsenceMode('none')} />
            <Chip label="Giorno intero (ferie)" selected={absenceMode === 'full'} onPress={selectFull} />
            <Chip label="Fascia oraria (permesso)" selected={absenceMode === 'partial'} onPress={() => setAbsenceMode('partial')} />
          </View>

          {absenceMode === 'partial' && (
            <View style={styles.timeRow}>
              <View style={styles.timeField}>
                <TextField label="Da" value={startTime} onChangeText={setStartTime} placeholder="14:00" />
              </View>
              <View style={styles.timeField}>
                <TextField label="A" value={endTime} onChangeText={setEndTime} placeholder="18:00" />
              </View>
            </View>
          )}

          {absenceMode !== 'full' && (
            <>
              <Text style={styles.sectionLabel}>Fascia oraria richiesta per questo giorno</Text>
              <Text style={styles.hint}>
                Se quel giorno lavori, chiedi di essere messo solo in questa fascia (es. solo sera).
              </Text>
              <View style={styles.chipsRow}>
                <Chip label="Nessuna" selected={categoryId === null} onPress={() => setCategoryId(null)} />
                {categories.map((category) => (
                  <Chip
                    key={category.id}
                    label={category.name}
                    selected={categoryId === category.id}
                    onPress={() => setCategoryId(category.id)}
                  />
                ))}
              </View>
            </>
          )}

          <View style={styles.actions}>
            <View style={styles.actionButton}>
              <Button label="Chiudi" variant="secondary" onPress={onClose} />
            </View>
            <View style={styles.actionButton}>
              <Button label="Salva" onPress={handleSave} loading={saving} />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    maxHeight: '85%',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: 8,
  },
  hint: {
    fontSize: 11,
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
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
  },
});
