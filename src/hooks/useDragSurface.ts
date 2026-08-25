import { useRef } from 'react';
import { GestureResponderEvent, PanResponder, View } from 'react-native';

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
 * da scroll della pagina o zoom del testo. Un tentativo precedente combinava `pageX/pageY`
 * (relative all'intera pagina) con `measureInWindow` (relativo al solo viewport): la differenza
 * tra i due sistemi produceva uno scarto tra il punto toccato e il colore selezionato. Rivendica
 * il gesto sia in fase di cattura che di bubbling per evitare che uno ScrollView antenato lo
 * intercetti.
 */
export function useDragSurface({ onMove, onRelease }: UseDragSurfaceOptions) {
  const containerRef = useRef<View>(null);

  const handleMove = (evt: GestureResponderEvent) => {
    const { locationX, locationY } = evt.nativeEvent;
    onMove(locationX, locationY);
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
