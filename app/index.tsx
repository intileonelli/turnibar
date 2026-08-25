import { Text, View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/src/components/shared/ScreenContainer';
import { Button } from '@/src/components/shared/Button';
import { colors } from '@/src/components/shared/colors';
import { strings } from '@/src/i18n/strings';
import { useCurrentAuth } from '@/src/context/AuthContext';

export default function HomeScreen() {
  const router = useRouter();
  const { profile, signOut } = useCurrentAuth();
  const isOwner = profile?.role === 'owner';

  return (
    <ScreenContainer>
      <Text style={styles.title}>{strings.home.title}</Text>
      <Text style={styles.subtitle}>{strings.home.subtitle}</Text>
      {profile && (
        <Text style={styles.account}>
          Collegato come {profile.fullName} · {isOwner ? 'Titolare' : 'Dipendente'}
        </Text>
      )}

      <View style={styles.actions}>
        {isOwner && (
          <>
            <Button label={strings.home.goToEmployees} onPress={() => router.push('/dipendenti')} />
            <View style={styles.spacer} />
            <Button
              label={strings.home.goToShop}
              variant="secondary"
              onPress={() => router.push('/negozio')}
            />
            <View style={styles.spacer} />
          </>
        )}
        <Button
          label={strings.home.goToCalendar}
          variant="secondary"
          onPress={() => router.push('/calendario')}
        />
        <View style={styles.spacer} />
        <Button label={strings.home.goToLeave} variant="secondary" onPress={() => router.push('/ferie')} />
        {isOwner && (
          <>
            <View style={styles.spacer} />
            <Button
              label="Importa dati locali"
              variant="secondary"
              onPress={() => router.push('/migrazione-dati')}
            />
          </>
        )}
        <View style={styles.spacer} />
        <Button
          label="Cambia password"
          variant="secondary"
          onPress={() => router.push('/cambia-password')}
        />
        <View style={styles.spacer} />
        <Button label="Esci" variant="danger" onPress={() => signOut()} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    marginTop: 12,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textMuted,
    marginBottom: 8,
  },
  account: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 24,
  },
  actions: {
    marginTop: 8,
  },
  spacer: {
    height: 12,
  },
});
