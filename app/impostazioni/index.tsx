import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/src/components/shared/ScreenContainer';
import { Button } from '@/src/components/shared/Button';
import { useCurrentAuth } from '@/src/context/AuthContext';

export default function SettingsHubScreen() {
  const router = useRouter();
  const { profile } = useCurrentAuth();
  const isOwner = profile?.role === 'owner';

  return (
    <ScreenContainer>
      <Button label="Cambia password" variant="secondary" onPress={() => router.push('/impostazioni/cambia-password')} />
      <View style={styles.spacer} />

      {isOwner && (
        <>
          <Button
            label="Accessi dipendenti"
            variant="secondary"
            onPress={() => router.push('/impostazioni/accessi')}
          />
          <View style={styles.spacer} />
          <Button
            label="Personalizzazione"
            variant="secondary"
            onPress={() => router.push('/impostazioni/aspetto')}
          />
          <View style={styles.spacer} />
          <Button
            label="Importa dati locali"
            variant="secondary"
            onPress={() => router.push('/impostazioni/migrazione-dati')}
          />
        </>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  spacer: {
    height: 12,
  },
});
