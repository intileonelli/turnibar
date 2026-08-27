import { useEffect, useState } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { CategoryRequest, ShiftCategory, TimeOff } from '@/src/models';
import { Button } from '@/src/components/shared/Button';
import { Chip } from '@/src/components/shared/Chip';
import { TextField } from '@/src/components/shared/TextField';
import { colors } from '@/src/components/shared/colors';
import { formatDateLong, normalizeTime } from '@/src/utils/date';
import { showAlert } from '@/src/utils/alert';

type Mode = 'none' | 'full' | 'partial' | 'category';

export type DaySelection =
  | { mode: 'none' }
  | { mode: 'full' }
  | { mode: 'partial'; startTime: string; endTime: string }
  | { mode: 'category'; categoryId: string };

export interface DayAbsenceModalProps {
  visible: boolean;
  date: string | null;
  /**
   * Se presente (con più di un elemento), la modale lavora in modalità "giorni multipli": il
   * titolo mostra il conteggio invece della data, e non si precompila da currentTimeOff/
   * currentCategoryRequest (giorni diversi possono avere stati diversi, non c'è un unico "stato
   * attuale" da mostrare). Chi chiama applica poi la stessa scelta a tutte le date.
   */
  dates?: string[];
  currentTimeOff?: TimeOff;
  currentCategoryRequest?: CategoryRequest;
  categories: ShiftCategory[];
  saving: boolean;
  onClose: () => void;
  onSave: (selection: DaySelection) => void;
}

export function DayAbsenceModal({
  visible,
  date,
  dates,
  currentTimeOff,
  currentCategoryRequest,
  categories,
  saving,
  onClose,
  onSave,
}: DayAbsenceModalProps) {
  const isMultiDay = (dates?.length ?? 0) > 0;
  const [mode, setMode] = useState<Mode>('none');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('13:00');
  const [categoryId, setCategoryId] = useState<string | null>(null);

  // Permesso (orario specifico) e fascia richiesta (macro categoria) sono alternativi: chiedere
  // "solo apertura" e allo stesso tempo un permesso 09-13 quel giorno può azzerare gli slot
  // disponibili per la fascia richiesta, escludendo la persona da tutto. Per questo la scelta è
  // una sola tra le opzioni sotto, non una combinazione.
  const selectCategory = (id: string) => {
    setMode('category');
    setCategoryId(id);
  };

  useEffect(() => {
    if (!visible) return;
    if (isMultiDay) {
      // Niente precompilazione: si parte sempre da "Nessuna" e si sceglie cosa applicare a
      // tutti i giorni selezionati.
      setMode('none');
      setCategoryId(null);
      setStartTime('09:00');
      setEndTime('13:00');
      return;
    }
    if (currentCategoryRequest) {
      setMode('category');
      setCategoryId(currentCategoryRequest.categoryId);
    } else if (currentTimeOff?.startTime && currentTimeOff.endTime) {
      setMode('partial');
      setStartTime(currentTimeOff.startTime);
      setEndTime(currentTimeOff.endTime);
    } else if (currentTimeOff) {
      setMode('full');
    } else {
      setMode('none');
    }
    if (!currentCategoryRequest) setCategoryId(null);
    if (!(currentTimeOff?.startTime && currentTimeOff?.endTime)) {
      setStartTime('09:00');
      setEndTime('13:00');
    }
  }, [visible, currentTimeOff, currentCategoryRequest, isMultiDay]);

  const handleSave = () => {
    if (mode === 'partial') {
      const normalizedStart = normalizeTime(startTime);
      const normalizedEnd = normalizeTime(endTime);
      if (!normalizedStart || !normalizedEnd) {
        showAlert('Orario non valido', 'Inserisci gli orari nel formato HH:mm (es. 14:00).');
        return;
      }
      onSave({ mode: 'partial', startTime: normalizedStart, endTime: normalizedEnd });
      return;
    }
    if (mode === 'category') {
      if (!categoryId) return;
      onSave({ mode: 'category', categoryId });
      return;
    }
    onSave({ mode });
  };

  if (!date && !isMultiDay) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>
            {isMultiDay ? `${dates!.length} giorni selezionati` : formatDateLong(date!)}
          </Text>

          <Text style={styles.sectionLabel}>Cosa vuoi impostare per questo giorno?</Text>
          <Text style={styles.hint}>
            Scegli una sola opzione: un permesso su un orario specifico, oppure una fascia di lavoro
            richiesta (es. solo apertura).
          </Text>
          <View style={styles.chipsRow}>
            <Chip label="Nessuna" selected={mode === 'none'} onPress={() => setMode('none')} />
            <Chip label="Giorno intero (ferie)" selected={mode === 'full'} onPress={() => setMode('full')} />
            <Chip label="Fascia oraria (permesso)" selected={mode === 'partial'} onPress={() => setMode('partial')} />
            {categories.map((category) => (
              <Chip
                key={category.id}
                label={`Solo ${category.name}`}
                selected={mode === 'category' && categoryId === category.id}
                onPress={() => selectCategory(category.id)}
              />
            ))}
          </View>

          {mode === 'partial' && (
            <View style={styles.timeRow}>
              <View style={styles.timeField}>
                <TextField label="Da" value={startTime} onChangeText={setStartTime} placeholder="14:00" />
              </View>
              <View style={styles.timeField}>
                <TextField label="A" value={endTime} onChangeText={setEndTime} placeholder="18:00" />
              </View>
            </View>
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
