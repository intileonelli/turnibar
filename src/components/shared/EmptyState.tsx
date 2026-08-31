import { StyleSheet, Text, View } from 'react-native';
import { Card } from './Card';
import { colors } from './colors';

interface EmptyStateProps {
  icon: string;
  title: string;
  subtitle?: string;
}

/** Stato vuoto con un'emoji al posto del solo testo piatto (es. "Nessuno è assente questo mese"). */
export function EmptyState({ icon, title, subtitle }: EmptyStateProps) {
  return (
    <Card style={styles.card}>
      <View style={styles.iconCircle}>
        <Text style={styles.icon}>{icon}</Text>
      </View>
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  iconCircle: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: colors.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  icon: {
    fontSize: 21,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 11.5,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 16,
  },
});
