import { Platform, Text, View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/src/components/shared/ScreenContainer';
import { Button } from '@/src/components/shared/Button';
import { IconTile, IconTileProps } from '@/src/components/shared/IconTile';
import { colors } from '@/src/components/shared/colors';
import { useCompany } from '@/src/hooks/useCompany';
import { strings } from '@/src/i18n/strings';
import { useCurrentAuth } from '@/src/context/AuthContext';

const TILES_PER_ROW = 3;

/** Emoji dei riquadri della Home (scelte nell'anteprima di restyling approvata). */
const TILE_ICONS = {
  dipendenti: '👥',
  negozio: '🏬',
  calendario: '📅',
  ferie: '🏖️',
  impostazioni: '⚙️',
};

function chunk<T>(items: T[], size: number): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += size) rows.push(items.slice(i, i + size));
  return rows;
}

export default function HomeScreen() {
  const router = useRouter();
  const { session, profile, signOut } = useCurrentAuth();
  const { company } = useCompany();
  const isOwner = profile?.role === 'owner';
  const isFounder = !!company && session?.user.id === company.founderProfileId;
  const roleLabel = isFounder ? 'Titolare' : isOwner ? 'Amministratore' : 'Dipendente';

  const tiles: (Omit<IconTileProps, 'onPress'> & { route: string })[] = [
    ...(isOwner ? [{ icon: TILE_ICONS.dipendenti, label: 'Dipendenti', route: '/dipendenti' }] : []),
    ...(isOwner ? [{ icon: TILE_ICONS.negozio, label: 'Negozio', route: '/negozio' }] : []),
    { icon: TILE_ICONS.calendario, label: 'Turni', route: '/calendario' },
    { icon: TILE_ICONS.ferie, label: 'Ferie', route: '/ferie' },
    { icon: TILE_ICONS.impostazioni, label: 'Impostazioni', route: '/impostazioni' },
  ];
  // Righe da 3 e poi da 2 (effetto "a nido d'ape") invece di lasciare che vadano a capo da sole,
  // che con larghezze diverse dello schermo può spezzare le righe in modo imprevedibile.
  const tileRows = chunk(tiles, TILES_PER_ROW);

  return (
    <ScreenContainer scroll={false} style={styles.container}>
      <View style={styles.logoutCorner}>
        <Button label="Logout" variant="danger" onPress={() => signOut()} />
      </View>

      <View style={styles.centerArea}>
        <View style={styles.titleWrap}>
          <Text style={styles.title}>{company?.name ?? strings.home.title}</Text>
          <View
            style={[
              styles.titleRule,
              // Sfumatura indaco→accento solo su web (react-native-web supporta "background"
              // CSS); su nativo resta un semplice trattino nel colore secondario.
              Platform.OS === 'web'
                ? ({ background: `linear-gradient(90deg, ${colors.primary}, ${colors.accent})` } as object)
                : { backgroundColor: colors.accent },
            ]}
          />
        </View>

        <View style={styles.grid}>
          {tileRows.map((row, rowIndex) => (
            <View key={rowIndex} style={styles.row}>
              {row.map((tile) => (
                <IconTile key={tile.route} icon={tile.icon} label={tile.label} onPress={() => router.push(tile.route)} />
              ))}
            </View>
          ))}
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
  titleWrap: {
    alignItems: 'center',
    marginBottom: 28,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
  },
  titleRule: {
    width: 34,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.accent,
    marginTop: 8,
  },
  account: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 4,
    textAlign: 'right',
  },
  grid: {
    gap: 16,
  },
  row: {
    flexDirection: 'row',
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
