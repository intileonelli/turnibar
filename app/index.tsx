import { Text, View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/src/components/shared/ScreenContainer';
import { Button } from '@/src/components/shared/Button';
import { IconTile } from '@/src/components/shared/IconTile';
import { colors } from '@/src/components/shared/colors';
import { NAV_ICONS } from '@/src/constants/navIcons';
import { useCompany } from '@/src/hooks/useCompany';
import { strings } from '@/src/i18n/strings';
import { useCurrentAuth } from '@/src/context/AuthContext';

export default function HomeScreen() {
  const router = useRouter();
  const { profile, signOut } = useCurrentAuth();
  const { company } = useCompany();
  const isOwner = profile?.role === 'owner';

  return (
    <ScreenContainer scroll={false} style={styles.container}>
      <View>
        <Text style={styles.title}>{company?.name ?? strings.home.title}</Text>
        {profile && (
          <Text style={styles.account}>
            Collegato come {profile.fullName} · {isOwner ? 'Titolare' : 'Dipendente'}
          </Text>
        )}

        <View style={styles.grid}>
          {isOwner && (
            <IconTile icon={NAV_ICONS.dipendenti} label="Dipendenti" onPress={() => router.push('/dipendenti')} />
          )}
          {isOwner && (
            <IconTile icon={NAV_ICONS.negozio} label="Negozio" onPress={() => router.push('/negozio')} />
          )}
          <IconTile icon={NAV_ICONS.calendario} label="Calendario" onPress={() => router.push('/calendario')} />
          <IconTile icon={NAV_ICONS.ferie} label="Ferie" onPress={() => router.push('/ferie')} />
        </View>

        <View style={styles.actions}>
          {isOwner && (
            <>
              <Button
                label="Importa dati locali"
                variant="secondary"
                onPress={() => router.push('/migrazione-dati')}
              />
              <View style={styles.spacer} />
            </>
          )}
          <Button
            label="Cambia password"
            variant="secondary"
            onPress={() => router.push('/cambia-password')}
          />
          <View style={styles.spacer} />
          <Button label="Esci" variant="danger" onPress={() => signOut()} />
        </View>
      </View>

      <Text style={styles.subtitleCorner}>{strings.home.subtitle}</Text>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    marginTop: 12,
  },
  account: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 4,
    marginBottom: 24,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actions: {
    marginTop: 8,
  },
  spacer: {
    height: 12,
  },
  subtitleCorner: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'right',
  },
});
