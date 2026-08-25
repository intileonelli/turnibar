import { StyleSheet, Text, View } from 'react-native';
import { colors } from './colors';

type Tone = 'default' | 'danger' | 'warning' | 'success';

interface BadgeProps {
  label: string;
  tone?: Tone;
}

export function Badge({ label, tone = 'default' }: BadgeProps) {
  // Calcolato ad ogni render (non a livello di modulo) perché colors.primary/primaryMuted
  // possono cambiare a runtime (personalizzazione colori dell'azienda).
  const toneStyles: Record<Tone, { bg: string; fg: string }> = {
    default: { bg: colors.primaryMuted, fg: colors.primary },
    danger: { bg: colors.dangerMuted, fg: colors.danger },
    warning: { bg: colors.warningMuted, fg: colors.warning },
    success: { bg: colors.successMuted, fg: colors.success },
  };
  const toneStyle = toneStyles[tone];
  return (
    <View style={[styles.badge, { backgroundColor: toneStyle.bg }]}>
      <Text style={[styles.label, { color: toneStyle.fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
  },
});
