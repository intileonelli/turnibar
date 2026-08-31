import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { TextField } from '@/src/components/shared/TextField';
import { Button } from '@/src/components/shared/Button';
import { colors } from '@/src/components/shared/colors';
import { supabase } from '@/src/lib/supabase';
import { showAlert } from '@/src/utils/alert';

type Mode = 'login' | 'signup';

const MIN_PASSWORD_LENGTH = 8;

/** Almeno 8 caratteri, con un mix di lettere e numeri (non richiede maiuscole/simboli: regole
 * troppo rigide spingono a password prevedibili solo per soddisfare il pattern). */
function isPasswordStrongEnough(password: string): boolean {
  return password.length >= MIN_PASSWORD_LENGTH && /[a-zA-Z]/.test(password) && /[0-9]/.test(password);
}

export function AuthScreen() {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || !password) {
      showAlert('Dati mancanti', 'Inserisci email e password.');
      return;
    }
    if (mode === 'signup' && !isPasswordStrongEnough(password)) {
      showAlert(
        'Password troppo debole',
        `Deve avere almeno ${MIN_PASSWORD_LENGTH} caratteri, con almeno una lettera e un numero.`
      );
      return;
    }

    setLoading(true);
    try {
      const { error } =
        mode === 'login'
          ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
          : await supabase.auth.signUp({ email: email.trim(), password });

      if (error) {
        showAlert('Errore', error.message);
        return;
      }

      if (mode === 'signup') {
        showAlert(
          'Registrazione effettuata',
          'Se richiesto, controlla la tua email per confermare l\'account, poi accedi.'
        );
        setMode('login');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Turnibar</Text>
        <Text style={styles.subtitle}>
          {mode === 'login' ? 'Accedi al tuo account' : 'Crea un nuovo account'}
        </Text>

        <TextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="nome@esempio.it"
        />
        <TextField
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder={mode === 'signup' ? 'Almeno 8 caratteri, con lettere e numeri' : 'Password'}
        />

        <Button
          label={mode === 'login' ? 'Accedi' : 'Registrati'}
          onPress={handleSubmit}
          loading={loading}
        />

        <View style={styles.switchRow}>
          <Text style={styles.switchText}>
            {mode === 'login' ? 'Non hai un account?' : 'Hai già un account?'}
          </Text>
          <Text
            style={styles.switchLink}
            onPress={() => setMode(mode === 'login' ? 'signup' : 'login')}
          >
            {mode === 'login' ? 'Registrati' : 'Accedi'}
          </Text>
        </View>
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
    fontSize: 32,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 24,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: 16,
  },
  switchText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  switchLink: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '700',
  },
});
