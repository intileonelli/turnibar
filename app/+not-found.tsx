import { StyleSheet, Text } from 'react-native';
import { Link, Stack } from 'expo-router';
import { ScreenContainer } from '@/src/components/shared/ScreenContainer';
import { colors } from '@/src/components/shared/colors';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Pagina non trovata' }} />
      <ScreenContainer>
        <Text style={styles.title}>Questa schermata non esiste.</Text>
        <Link href="/" style={styles.link}>
          Torna alla home
        </Link>
      </ScreenContainer>
    </>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 16,
    color: colors.text,
    marginBottom: 12,
  },
  link: {
    fontSize: 15,
    color: colors.primary,
    fontWeight: '600',
  },
});
