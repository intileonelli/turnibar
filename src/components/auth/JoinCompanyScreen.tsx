import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { TextField } from '@/src/components/shared/TextField';
import { Chip } from '@/src/components/shared/Chip';
import { Button } from '@/src/components/shared/Button';
import { colors } from '@/src/components/shared/colors';
import { membershipRepository } from '@/src/db/repositories';
import { UnclaimedEmployee } from '@/src/db/repositories/membershipRepository';
import { showAlert } from '@/src/utils/alert';

interface JoinCompanyScreenProps {
  onBack: () => void;
  onDone: () => void;
}

/** Un dipendente entra in un'azienda già esistente: inserisce il codice ricevuto dal titolare, poi si "identifica" scegliendo il proprio nome dall'elenco. */
export function JoinCompanyScreen({ onBack, onDone }: JoinCompanyScreenProps) {
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<UnclaimedEmployee[] | null>(null);
  const [joining, setJoining] = useState(false);

  const handleSearch = async () => {
    if (!inviteCode.trim()) {
      showAlert('Codice mancante', 'Inserisci il codice azienda ricevuto dal titolare.');
      return;
    }
    setLoading(true);
    try {
      const list = await membershipRepository.listUnclaimedEmployees(inviteCode);
      if (list.length === 0) {
        showAlert(
          'Nessun dipendente disponibile',
          'Il codice potrebbe essere sbagliato, oppure tutti i dipendenti di questa azienda hanno già collegato il proprio account. Chiedi al titolare.'
        );
        return;
      }
      setEmployees(list);
    } catch (err) {
      showAlert('Errore', err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = async (employee: UnclaimedEmployee) => {
    setJoining(true);
    try {
      await membershipRepository.claimEmployeeIdentity(inviteCode, employee.id, employee.name);
      onDone();
    } catch (err) {
      showAlert('Errore', err instanceof Error ? err.message : String(err));
    } finally {
      setJoining(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Entra nella tua azienda</Text>

        {!employees ? (
          <>
            <Text style={styles.subtitle}>
              Inserisci il codice azienda che ti ha dato il titolare.
            </Text>
            <TextField
              label="Codice azienda"
              value={inviteCode}
              onChangeText={setInviteCode}
              autoCapitalize="none"
              placeholder="es. a1b2c3d4"
            />
            <Button label="Continua" onPress={handleSearch} loading={loading} />
          </>
        ) : (
          <>
            <Text style={styles.subtitle}>Quale di questi lavoratori sei?</Text>
            {employees.map((employee) => (
              <Chip
                key={employee.id}
                label={employee.name}
                selected={false}
                onPress={() => handleSelect(employee)}
              />
            ))}
            {joining && <Text style={styles.hint}>Collegamento in corso...</Text>}
          </>
        )}

        <Button label="Indietro" variant="secondary" onPress={onBack} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: colors.background,
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 8,
  },
  hint: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
