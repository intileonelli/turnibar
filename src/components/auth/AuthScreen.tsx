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
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View
          style={[
            styles.hero,
            // Sfumatura indaco→accento solo su web (react-native-web supporta "background"
            // CSS); su nativo un colore pieno, senza sfumatura.
            Platform.OS === 'web'
              ? ({ background: `linear-gradient(155deg, ${colors.primary} 0%, #4338CA 48%, ${colors.accent} 145%)` } as object)
              : { backgroundColor: colors.primary },
          ]}
        >
          <View style={[styles.heroBlob, styles.heroBlob1, { backgroundColor: colors.accent }]} />
          <View style={[styles.heroBlob, styles.heroBlob2]} />
          <View style={[styles.heroBlob, styles.heroBlob3]} />
          <View style={[styles.heroBlob, styles.heroBlob4, { backgroundColor: colors.accent }]} />
          {Platform.OS === 'web' && (
            <>
              <View
                pointerEvents="none"
                style={[
                  styles.heroTexture,
                  { background: 'radial-gradient(rgba(255,255,255,0.35) 1px, transparent 1.4px) 0 0/15px 15px repeat' } as object,
                ]}
              />
              <View
                pointerEvents="none"
                style={[
                  styles.heroSheen,
                  { background: 'linear-gradient(115deg, transparent 40%, rgba(255,255,255,0.16) 50%, transparent 60%)' } as object,
                ]}
              />
            </>
          )}
          <View style={styles.heroMark}>
            <Text style={styles.heroMarkIcon}>🍹</Text>
          </View>
          <Text style={styles.heroWordmark}>Turnibar</Text>
          <Text style={styles.heroTagline}>Gestione automatica dei turni</Text>
        </View>

        <View style={styles.container}>
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
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    backgroundColor: colors.background,
  },
  hero: {
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  heroBlob: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  heroBlob1: {
    width: 150,
    height: 150,
    top: -55,
    right: -45,
    opacity: 0.55,
  },
  heroBlob2: {
    width: 70,
    height: 70,
    bottom: -25,
    left: -10,
  },
  heroBlob3: {
    width: 44,
    height: 44,
    top: 26,
    left: 24,
  },
  heroBlob4: {
    width: 26,
    height: 26,
    bottom: 44,
    right: 34,
    opacity: 0.6,
  },
  heroTexture: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.5,
  },
  heroSheen: {
    position: 'absolute',
    top: '-20%',
    bottom: '-20%',
    left: '-50%',
    right: '-50%',
  },
  heroMark: {
    width: 56,
    height: 56,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  heroMarkIcon: {
    fontSize: 26,
  },
  heroWordmark: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.2,
  },
  heroTagline: {
    fontSize: 12.5,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 3,
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
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
