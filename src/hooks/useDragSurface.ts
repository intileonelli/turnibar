import { useRef } from 'react';
import { GestureResponderEvent, PanResponder, Platform, View } from 'react-native';
import { typographyState } from '@/src/components/shared/typography';

interface UseDragSurfaceOptions {
  /** Posizione del tocco relativa all'angolo in alto a sinistra della superficie, in pixel. */
  onMove: (relativeX: number, relativeY: number) => void;
  onRelease?: () => void;
}

/**
 * Gestione robusta del trascinamento (usata da ColorWheelPicker e Slider): usa `locationX`/
 * `locationY` dell'evento, che react-native-web calcola come `clientX/clientY` meno il
 * `getBoundingClientRect` dell'elemento a cui è agganciato il gesto (ricalcolato ad ogni
 * evento) — coordinate quindi già nello stesso sistema di riferimento, corrette a prescindere
 * da scroll della pagina. Un tentativo precedente combinava `pageX/pageY` (relative all'intera
 * pagina) con `measureInWindow` (relativo al solo viewport): la differenza tra i due sistemi
 * produceva uno scarto tra il punto toccato e il colore selezionato.
 *
 * `locationX/Y` sono però misurate nei pixel "renderizzati": con lo zoom CSS della dimensione
 * testo attivo (vedi typography.ts), l'elemento occupa fisicamente `size * scale` pixel pur
 * restando `size` nei calcoli interni dei componenti (raggio della ruota, larghezza dello
 * slider) — senza dividere per lo zoom corrente, il punto scelto si allontana dal tocco in modo
 * proporzionale allo zoom (più si ingrandisce il testo, più il cursore diventa impreciso).
 */
export function useDragSurface({ onMove, onRelease }: UseDragSurfaceOptions) {
  const containerRef = useRef<View>(null);

  const handleMove = (evt: GestureResponderEvent) => {
    const { locationX, locationY } = evt.nativeEvent;
    const scale = Platform.OS === 'web' ? typographyState.scale || 1 : 1;
    onMove(locationX / scale, locationY / scale);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderGrant: handleMove,
      onPanResponderMove: handleMove,
      onPanResponderRelease: () => onRelease?.(),
      onPanResponderTerminate: () => onRelease?.(),
    })
  ).current;

  return { containerRef, panHandlers: panResponder.panHandlers };
}
