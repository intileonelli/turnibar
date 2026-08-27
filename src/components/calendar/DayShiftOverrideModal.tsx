import { useEffect, useState } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { ShiftDayOverride, ShiftTemplate } from '@/src/models';
import { Button } from '@/src/components/shared/Button';
import { TextField } from '@/src/components/shared/TextField';
import { colors } from '@/src/components/shared/colors';
import { formatDateLong, normalizeTime } from '@/src/utils/date';
import { showAlert } from '@/src/utils/alert';

export interface DayShiftOverrideModalProps {
  visible: boolean;
  template: ShiftTemplate | null;
  date: string;
  currentOverride?: ShiftDayOverride;
  saving: boolean;
  onClose: () => void;
  onSaveTime: (startTime: string, endTime: string) => void;
  onHide: () => void;
  onRestore: () => void;
}

/**
 * Modifica un turno tipo SOLO per questa data (orario diverso o nascosto), senza toccare il
 * turno tipo ricorrente: l'eccezione viene cancellata automaticamente alla prossima generazione
 * turni per questa settimana.
 */
export function DayShiftOverrideModal({
  visible,
  template,
  date,
  currentOverride,
  saving,
  onClose,
  onSaveTime,
  onHide,
  onRestore,
}: DayShiftOverrideModalProps) {
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  useEffect(() => {
    if (!visible || !template) return;
    setStartTime(currentOverride?.startTime ?? template.startTime);
    setEndTime(currentOverride?.endTime ?? template.endTime);
  }, [visible, template, currentOverride]);

  if (!template) return null;

  const handleSaveTime = () => {
    const normalizedStart = normalizeTime(startTime);
    const normalizedEnd = normalizeTime(endTime);
    if (!normalizedStart || !normalizedEnd) {
      showAlert('Orario non valido', 'Inserisci gli orari nel formato HH:mm (es. 14:00).');
      return;
    }
    onSaveTime(normalizedStart, normalizedEnd);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{template.name}</Text>
          <Text style={styles.subtitle}>{formatDateLong(date)}</Text>
          <Text style={styles.hint}>
            La modifica vale solo per questo giorno: il turno tipo resta invariato, e alla
            prossima generazione turni per questa settimana torna quello standard (
            {template.startTime}-{template.endTime}).
          </Text>

          {currentOverride?.hidden ? (
            <Text style={styles.hiddenNotice}>Questo turno è nascosto per questo giorno.</Text>
          ) : (
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
            {!currentOverride?.hidden && (
              <Button label="Salva orario per questo giorno" onPress={handleSaveTime} loading={saving} />
            )}
            <View style={styles.spacer} />
            <Button
              label={currentOverride?.hidden ? 'Mostra di nuovo questo giorno' : 'Nascondi questo turno oggi'}
              variant="danger"
              onPress={currentOverride?.hidden ? onRestore : onHide}
              loading={saving}
            />
            {currentOverride && !currentOverride.hidden && (
              <>
                <View style={styles.spacer} />
                <Button label="Ripristina orario standard" variant="secondary" onPress={onRestore} loading={saving} />
              </>
            )}
            <View style={styles.spacer} />
            <Button label="Chiudi" variant="secondary" onPress={onClose} />
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
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: 8,
  },
  hint: {
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: 16,
  },
  hiddenNotice: {
    fontSize: 13,
    color: colors.warning,
    fontWeight: '600',
    marginBottom: 16,
  },
  timeRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  timeField: {
    flex: 1,
  },
  actions: {
    marginTop: 8,
  },
  spacer: {
    height: 10,
  },
});
