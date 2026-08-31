import { PropsWithChildren } from 'react';
import { Pressable, StyleSheet, View, ViewStyle } from 'react-native';
import { colors, themeState } from './colors';

interface CardProps extends PropsWithChildren {
  onPress?: () => void;
  style?: ViewStyle;
}

export function Card({ children, onPress, style }: CardProps) {
  // Ombra invece del bordo piatto: colore + geometria insieme in un unico oggetto inline, perché
  // react-native-web non calcola il box-shadow se il colore (che cambia a runtime con la
  // personalizzazione colori) è separato dalla geometria definita in StyleSheet.create.
  // L'opacità è moltiplicata per l'intensità scelta dal titolare (personalizzazione).
  const cardStyle = [
    styles.card,
    {
      shadowColor: colors.accent,
      backgroundColor: colors.surface,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.16 * themeState.shadowIntensity,
      shadowRadius: 16,
    },
    style,
  ];
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [...cardStyle, pressed && styles.pressed]}>
        {children}
      </Pressable>
    );
  }
  return <View style={cardStyle}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    elevation: 4,
  },
  pressed: {
    opacity: 0.7,
  },
});
