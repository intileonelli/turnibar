import { Text, View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/src/components/shared/ScreenContainer';
import { Button } from '@/src/components/shared/Button';
import { colors } from '@/src/components/shared/colors';
import { strings } from '@/src/i18n/strings';

export default function HomeScreen() {
  const router = useRouter();

  return (
    <ScreenContainer>
      <Text style={styles.title}>{strings.home.title}</Text>
      <Text style={styles.subtitle}>{strings.home.subtitle}</Text>

      <View style={styles.actions}>
        <Button label={strings.home.goToEmployees} onPress={() => router.push('/dipendenti')} />
        <View style={styles.spacer} />
        <Button
          label={strings.home.goToShop}
          variant="secondary"
          onPress={() => router.push('/negozio')}
        />
        <View style={styles.spacer} />
        <Button
          label={strings.home.goToCalendar}
          variant="secondary"
          onPress={() => router.push('/calendario')}
        />
        <View style={styles.spacer} />
        <Button label={strings.home.goToLeave} variant="secondary" onPress={() => router.push('/ferie')} />
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
    marginBottom: 24,
  },
  actions: {
    marginTop: 8,
  },
  spacer: {
    height: 12,
  },
});
