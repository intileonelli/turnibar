import { Platform, StyleSheet, View } from 'react-native';
import { BackgroundPatternId, backgroundPatternCss } from '@/src/utils/backgroundPattern';

interface ScreenBackgroundProps {
  color: string;
  opacity: number;
  /** Motivo ripetuto al posto del colore pieno (solo web: react-native-web supporta la
   * proprietà CSS "background", nativo no — lì si vede sempre il colore pieno). */
  pattern?: BackgroundPatternId;
  primaryColor: string;
  accentColor: string;
}

/** Velo di colore (o motivo ripetuto) sull'intera schermata, con opacità regolabile dal titolare (0-100). */
export function ScreenBackground({ color, opacity, pattern = 'none', primaryColor, accentColor }: ScreenBackgroundProps) {
  if (opacity <= 0) return null;

  const patternCss = Platform.OS === 'web' ? backgroundPatternCss(pattern, primaryColor, accentColor) : null;
  const resolvedOpacity = Math.min(opacity, 100) / 100;

  if (patternCss) {
    return (
      <View
        pointerEvents="none"
        // "background" non è nel tipo ViewStyle di React Native (è supportata solo da
        // react-native-web, che la passa direttamente al CSS): da qui il cast.
        style={[styles.overlay, { background: patternCss, opacity: resolvedOpacity } as object]}
      />
    );
  }

  return (
    <View
      pointerEvents="none"
      style={[styles.overlay, { backgroundColor: color, opacity: resolvedOpacity }]}
    />
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
});
