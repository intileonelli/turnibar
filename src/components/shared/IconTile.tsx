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
              // Ombra (colore + geometria) calcolata insieme ad ogni render: react-native-web non
              // calcola correttamente il box-shadow se il colore è in un oggetto inline separato
              // dalla geometria definita in StyleSheet.create (risulterebbe un'ombra invisibile,
              // 0px 0px 0px, finché un secondo stile con la sua stessa geometria non viene unito).
              {
                backgroundColor: colors.accentMuted,
                shadowColor: colors.primary,
                ...(pressed
                  ? { shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6 }
                  : { shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.28, shadowRadius: 14 }),
              },
              pressed && styles.iconCirclePressedTransform,
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
    elevation: 6,
  },
  // "Cedimento" al tocco: il cerchio si rimpicciolisce un po', come se venisse premuto verso il
  // basso (l'ombra si appiattisce tramite lo stile inline sopra, non qui).
  iconCirclePressedTransform: {
    transform: [{ scale: 0.94 }, { translateY: 1 }],
    elevation: 2,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
});
