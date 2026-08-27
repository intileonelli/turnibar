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
  const { session, profile, signOut } = useCurrentAuth();
  const { company } = useCompany();
  const isOwner = profile?.role === 'owner';
  const isFounder = !!company && session?.user.id === company.founderProfileId;
  const roleLabel = isFounder ? 'Titolare' : isOwner ? 'Amministratore' : 'Dipendente';

  return (
    <ScreenContainer scroll={false} style={styles.container}>
      <View style={styles.logoutCorner}>
        <Button label="Logout" variant="danger" onPress={() => signOut()} />
      </View>

      <View style={styles.centerArea}>
        <Text style={styles.title}>{company?.name ?? strings.home.title}</Text>

        <View style={styles.grid}>
          {isOwner && (
            <IconTile icon={NAV_ICONS.dipendenti} label="Dipendenti" onPress={() => router.push('/dipendenti')} />
          )}
          {isOwner && (
            <IconTile icon={NAV_ICONS.negozio} label="Negozio" onPress={() => router.push('/negozio')} />
          )}
          <IconTile icon={NAV_ICONS.calendario} label="Calendario" onPress={() => router.push('/calendario')} />
          <IconTile icon={NAV_ICONS.ferie} label="Ferie" onPress={() => router.push('/ferie')} />
          <IconTile
            icon={NAV_ICONS.impostazioni}
            label="Impostazioni"
            onPress={() => router.push('/impostazioni')}
          />
        </View>
      </View>

      <View style={styles.bottomCorner}>
        <Text style={styles.subtitleCorner}>{strings.home.subtitle}</Text>
        {profile && (
          <Text style={styles.account}>
            Collegato come {profile.fullName} · {roleLabel}
          </Text>
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  logoutCorner: {
    position: 'absolute',
    top: 0,
    right: 0,
    zIndex: 1,
  },
  centerArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 28,
  },
  account: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 4,
    textAlign: 'right',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
  },
  bottomCorner: {
    alignItems: 'flex-end',
  },
  subtitleCorner: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'right',
  },
});
