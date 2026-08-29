import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { colors, themeState } from './colors';

type Variant = 'primary' | 'secondary' | 'danger';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
}

export function Button({ label, onPress, variant = 'primary', disabled, loading }: ButtonProps) {
  // Calcolati ad ogni render (non a livello di modulo) perché colors.primary/primaryMuted
  // possono cambiare a runtime (personalizzazione colori dell'azienda).
  const variantBackground =
    variant === 'primary' ? colors.primary : variant === 'secondary' ? colors.primaryMuted : colors.danger;
  const shadowColor = variant === 'danger' ? colors.danger : colors.primary;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => {
        const isDisabled = disabled || loading;
        const isPressed = pressed && !isDisabled;
        return [
          styles.base,
          // Ombra (colore + geometria) insieme: react-native-web non calcola il box-shadow se il
          // colore arriva in un oggetto inline separato dalla geometria di StyleSheet.create.
          {
            backgroundColor: variantBackground,
            shadowColor,
            ...(isDisabled
              ? { shadowOpacity: 0 }
              : isPressed
                ? { shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.18 * themeState.shadowIntensity, shadowRadius: 4 }
                : { shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.22 * themeState.shadowIntensity, shadowRadius: 10 }),
          },
          isDisabled && styles.disabled,
          isPressed && styles.pressedTransform,
        ];
      }}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'secondary' ? colors.primary : '#fff'} />
      ) : (
        <Text style={[styles.label, variant === 'secondary' && { color: colors.primary }]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
  },
  // "Cedimento" al tocco: si appiattisce leggermente, come i cerchi della Home (l'ombra si
  // appiattisce tramite lo stile inline sopra, non qui).
  pressedTransform: {
    transform: [{ scale: 0.97 }, { translateY: 1 }],
    elevation: 1,
  },
  disabled: {
    opacity: 0.5,
    elevation: 0,
  },
  label: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
