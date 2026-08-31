import { Platform, StyleSheet, View } from 'react-native';
import { BackgroundPatternId, backgroundPatternCss } from '@/src/utils/backgroundPattern';

interface ScreenBackgroundProps {
  color: string;
  opacity: number;
  /** Motivo ripetuto al posto del colore pieno (solo web: react-native-web supporta la
   * proprietà CSS "background", nativo no — lì si vede sempre il colore pieno). */
  pattern?: BackgroundPatternId;
  /** Colori dedicati al motivo (separati da primario/secondario dell'app). */
  patternColor1: string;
  patternColor2: string;
}

/** Velo di colore (o motivo ripetuto) sull'intera schermata, con opacità regolabile dal titolare (0-100). */
export function ScreenBackground({ color, opacity, pattern = 'none', patternColor1, patternColor2 }: ScreenBackgroundProps) {
  if (opacity <= 0) return null;

  const patternCss = Platform.OS === 'web' ? backgroundPatternCss(pattern, patternColor1, patternColor2) : null;
  const resolvedOpacity = Math.min(opacity, 100) / 100;

  if (patternCss) {
    return (
      <View
        pointerEvents="none"
        // "background" non è nel tipo ViewStyle di React Native (è supportata solo da
        // react-native-web, che la passa direttamente al CSS): da qui il cast. Il colore
        // scelto va appeso in fondo alla stringa (senza virgola, sull'ultimo "layer"): è così
        // che il CSS "background" imposta anche un colore di base, altrimenti tra le linee del
        // motivo si vedrebbe sempre il bianco della pagina invece del colore scelto.
        style={[styles.overlay, { background: `${patternCss} ${color}`, opacity: resolvedOpacity } as object]}
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
