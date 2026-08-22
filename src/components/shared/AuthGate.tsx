import { PropsWithChildren, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useAuth } from '@/src/hooks/useAuth';
import { AuthProvider } from '@/src/context/AuthContext';
import { AuthScreen } from '@/src/components/auth/AuthScreen';
import { RoleChoiceScreen } from '@/src/components/auth/RoleChoiceScreen';
import { CompleteSetupScreen } from '@/src/components/auth/CompleteSetupScreen';
import { JoinCompanyScreen } from '@/src/components/auth/JoinCompanyScreen';
import { colors } from './colors';

type OnboardingChoice = 'none' | 'owner' | 'employee';

/** Mostra login/registrazione, poi la scelta titolare/dipendente al primo accesso, prima dell'app vera e propria. */
export function AuthGate({ children }: PropsWithChildren) {
  const { session, profile, loading, reloadProfile, signOut } = useAuth();
  const [choice, setChoice] = useState<OnboardingChoice>('none');

  // Il valore del contesto deve restare stabile tra un render e l'altro (a parità di dati):
  // se cambiasse riferimento ad ogni render, ogni schermata che lo consuma (inclusa la barra
  // delle schede) si ri-renderizzerebbe inutilmente, con il rischio di "saltare" alla Home.
  const authValue = useMemo(
    () => ({ session, profile, reloadProfile, signOut }),
    [session, profile, reloadProfile, signOut]
  );

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
    if (choice === 'owner') {
      return <CompleteSetupScreen onDone={reloadProfile} />;
    }
    if (choice === 'employee') {
      return (
        <JoinCompanyScreen onBack={() => setChoice('none')} onDone={reloadProfile} />
      );
    }
    return (
      <RoleChoiceScreen
        onChooseOwner={() => setChoice('owner')}
        onChooseEmployee={() => setChoice('employee')}
      />
    );
  }

  return <AuthProvider value={authValue}>{children}</AuthProvider>;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});
