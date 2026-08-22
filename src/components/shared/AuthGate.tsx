import { PropsWithChildren } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useAuth } from '@/src/hooks/useAuth';
import { AuthScreen } from '@/src/components/auth/AuthScreen';
import { CompleteSetupScreen } from '@/src/components/auth/CompleteSetupScreen';
import { colors } from './colors';

/** Mostra login/registrazione, poi la configurazione azienda al primo accesso, prima dell'app vera e propria. */
export function AuthGate({ children }: PropsWithChildren) {
  const { session, profile, loading, reloadProfile } = useAuth();

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!session) {
    return <AuthScreen />;
  }

  if (!profile) {
    return <CompleteSetupScreen userId={session.user.id} onDone={reloadProfile} />;
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});
