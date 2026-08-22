import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { TextField } from '@/src/components/shared/TextField';
import { Button } from '@/src/components/shared/Button';
import { colors } from '@/src/components/shared/colors';
import { supabase } from '@/src/lib/supabase';
import { showAlert } from '@/src/utils/alert';

interface CompleteSetupScreenProps {
  onDone: () => void;
}

/** Mostrata al primo accesso: chi si registra crea qui la propria azienda ed è il titolare. */
export function CompleteSetupScreen({ onDone }: CompleteSetupScreenProps) {
  const [companyName, setCompanyName] = useState('');
  const [fullName, setFullName] = useState('');
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!companyName.trim() || !fullName.trim()) {
      showAlert('Dati mancanti', 'Inserisci il nome della tua attività e il tuo nome.');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.rpc('create_company_and_owner_profile', {
        company_name: companyName.trim(),
        owner_full_name: fullName.trim(),
      });

      if (error) {
        showAlert('Errore', error.message);
        return;
      }

      onDone();
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Benvenuto!</Text>
        <Text style={styles.subtitle}>
          Prima di iniziare, dicci qualcosa sulla tua attività.
        </Text>

        <TextField
          label="Nome della tua attività"
          value={companyName}
          onChangeText={setCompanyName}
          placeholder="Es. Bar Centrale"
        />
        <TextField
          label="Il tuo nome"
          value={fullName}
          onChangeText={setFullName}
          placeholder="Es. Inti Leonelli"
        />

        <Button label="Crea la mia azienda" onPress={handleCreate} loading={saving} />
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
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 24,
  },
});
