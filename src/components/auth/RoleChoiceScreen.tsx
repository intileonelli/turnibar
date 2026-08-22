import { StyleSheet, Text, View } from 'react-native';
import { Button } from '@/src/components/shared/Button';
import { colors } from '@/src/components/shared/colors';

interface RoleChoiceScreenProps {
  onChooseOwner: () => void;
  onChooseEmployee: () => void;
}

/** Primo accesso: chi si registra deve dire se è il titolare (crea l'azienda) o un dipendente (si collega a un'azienda già esistente). */
export function RoleChoiceScreen({ onChooseOwner, onChooseEmployee }: RoleChoiceScreenProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Benvenuto!</Text>
      <Text style={styles.subtitle}>Prima di iniziare, dicci chi sei.</Text>

      <View style={styles.spacer} />
      <Button label="Sono il titolare, creo la mia azienda" onPress={onChooseOwner} />
      <View style={styles.spacer} />
      <Button
        label="Sono un dipendente, ho un codice azienda"
        variant="secondary"
        onPress={onChooseEmployee}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 12,
  },
  spacer: {
    height: 12,
  },
});
