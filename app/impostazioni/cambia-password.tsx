import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/src/components/shared/ScreenContainer';
import { TextField } from '@/src/components/shared/TextField';
import { Button } from '@/src/components/shared/Button';
import { colors } from '@/src/components/shared/colors';
import { supabase } from '@/src/lib/supabase';
import { showAlert } from '@/src/utils/alert';

export default function ChangePasswordScreen() {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (newPassword.length < 6) {
      showAlert('Password troppo corta', 'La password deve avere almeno 6 caratteri.');
      return;
    }
    if (newPassword !== confirmPassword) {
      showAlert('Le password non coincidono', 'Controlla di aver scritto la stessa password in entrambi i campi.');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        showAlert('Errore', error.message);
        return;
      }
      showAlert('Fatto', 'Password aggiornata.');
      router.back();
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenContainer>
      <Text style={styles.hint}>Scegli una nuova password per il tuo account.</Text>

      <TextField
        label="Nuova password"
        value={newPassword}
        onChangeText={setNewPassword}
        secureTextEntry
        placeholder="Almeno 6 caratteri"
      />
      <TextField
        label="Conferma nuova password"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
        placeholder="Ripeti la password"
      />

      <Button label="Salva" onPress={handleSubmit} loading={saving} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  hint: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 16,
  },
});
