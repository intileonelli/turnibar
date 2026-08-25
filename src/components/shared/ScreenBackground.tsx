import { StyleSheet, View } from 'react-native';

/** Velo di colore sull'intera schermata, con opacità regolabile dal titolare (0-100). */
export function ScreenBackground({ color, opacity }: { color: string; opacity: number }) {
  if (opacity <= 0) return null;

  return (
    <View
      pointerEvents="none"
      style={[styles.overlay, { backgroundColor: color, opacity: Math.min(opacity, 100) / 100 }]}
    />
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
});
