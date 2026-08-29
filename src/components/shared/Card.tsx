import { PropsWithChildren } from 'react';
import { Pressable, StyleSheet, View, ViewStyle } from 'react-native';
import { colors } from './colors';

interface CardProps extends PropsWithChildren {
  onPress?: () => void;
  style?: ViewStyle;
}

export function Card({ children, onPress, style }: CardProps) {
  // Ombra invece del bordo piatto: calcolata ad ogni render perché colors.primary può cambiare
  // a runtime con la personalizzazione colori dell'azienda.
  const cardStyle = [styles.card, { shadowColor: colors.primary, backgroundColor: colors.surface }, style];
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
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  pressed: {
    opacity: 0.7,
  },
});
