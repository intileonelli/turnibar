import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from './colors';

export interface IconTileProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}

export function IconTile({ icon, label, onPress }: IconTileProps) {
  return (
    <Pressable onPress={onPress} style={styles.tile}>
      {({ pressed }) => (
        <>
          <View
            style={[
              styles.iconCircle,
              // Ombra calcolata ad ogni render (non in StyleSheet.create) perché colors.accent/
              // colors.primary possono cambiare a runtime con la personalizzazione colori.
              { backgroundColor: colors.accentMuted, shadowColor: colors.primary },
              pressed && styles.iconCirclePressed,
            ]}
          >
            <Ionicons name={icon} size={28} color={colors.accent} />
          </View>
          <Text style={styles.label} numberOfLines={2}>
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    width: 92,
    alignItems: 'center',
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 6,
  },
  // "Cedimento" al tocco: il cerchio si rimpicciolisce un po' e l'ombra si appiattisce, come se
  // venisse premuto verso il basso.
  iconCirclePressed: {
    transform: [{ scale: 0.94 }, { translateY: 1 }],
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 2,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
});
