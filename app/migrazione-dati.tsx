import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { ScreenContainer } from '@/src/components/shared/ScreenContainer';
import { Button } from '@/src/components/shared/Button';
import { colors } from '@/src/components/shared/colors';
import { migrateLocalDataToCloud } from '@/src/utils/migrateLocalDataToCloud';
import { confirmAction, showAlert } from '@/src/utils/alert';

export default function MigrateDataScreen() {
  const [running, setRunning] = useState(false);
  const [lines, setLines] = useState<string[]>([]);

  const handleStart = () => {
    confirmAction(
      'Importare i dati locali?',
      'Verranno copiati sul cloud i dati inseriti finora in locale su questo dispositivo (dipendenti, ruoli, turni tipo, ferie, indisponibilità e pianificazioni). Esegui questa operazione una sola volta, altrimenti rischi di creare duplicati.',
      async () => {
        setRunning(true);
        setLines([]);
        try {
          await migrateLocalDataToCloud((line) => setLines((prev) => [...prev, line]));
          showAlert('Fatto', 'Importazione completata con successo.');
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          setLines((prev) => [...prev, `❌ Errore: ${message}`]);
          showAlert('Errore', message);
        } finally {
          setRunning(false);
        }
      },
      'Importa'
    );
  };

  return (
    <ScreenContainer>
      <Text style={styles.title}>Importa dati locali</Text>
      <Text style={styles.subtitle}>
        Se avevi già inserito dipendenti, turni o ferie prima del passaggio al cloud, usa questo
        pulsante per copiarli qui — una sola volta.
      </Text>

      <Button label="Avvia importazione" onPress={handleStart} loading={running} />

      {lines.length > 0 && (
        <View style={styles.logBox}>
          <ScrollView>
            {lines.map((line, i) => (
              <Text key={i} style={styles.logLine}>
                {line}
              </Text>
            ))}
          </ScrollView>
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    marginTop: 12,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 20,
  },
  logBox: {
    marginTop: 20,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    maxHeight: 360,
  },
  logLine: {
    fontSize: 12,
    color: colors.text,
    marginBottom: 4,
    fontFamily: 'monospace',
  },
});
