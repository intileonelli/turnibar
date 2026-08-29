import { useEffect, useRef } from 'react';
import { GestureResponderEvent, PanResponder, Platform, View } from 'react-native';
import { typographyState } from '@/src/components/shared/typography';

interface UseDragSurfaceOptions {
  /** Posizione del tocco relativa all'angolo in alto a sinistra della superficie, in pixel. */
  onMove: (relativeX: number, relativeY: number) => void;
  onRelease?: () => void;
}

/**
 * Gestione del trascinamento per ColorWheelPicker e Slider.
 *
 * Su WEB si usano direttamente gli eventi puntatore nativi del browser (`pointerdown` sull'
 * elemento, poi `pointermove`/`pointerup` su `window` finché non si rilascia), leggendo
 * `clientX/clientY` e confrontandoli con `getBoundingClientRect()` dello stesso elemento: sono
 * per definizione nello stesso sistema di riferimento (quello visibile a schermo), quindi
 * corretti automaticamente a prescindere da scroll o zoom della pagina. Due tentativi precedenti
 * passavano dalla gestione "sintetica" dei tocchi di React Native Web (prima `pageX`/`pageY` con
 * `measureInWindow`, poi `locationX`/`locationY`): in entrambi i casi il pallino scelto restava
 * sistematicamente lontano dal punto toccato anche con un singolo tap, segno di un problema nella
 * conversione delle coordinate di quello strato intermedio — bypassato del tutto qui.
 *
 * Su nativo (iOS/Android) resta invece il PanResponder di React Native con `locationX/locationY`,
 * che lì funziona correttamente (il problema è specifico del web).
 *
 * `clientX/clientY` e `getBoundingClientRect()` restituiscono pixel "fisici" (quelli
 * effettivamente disegnati a schermo), mentre i componenti che usano questo hook (raggio della
 * ruota, larghezza dello slider) ragionano in pixel "logici" della loro prop `size`/`width`: con
 * lo zoom CSS della dimensione testo attivo (vedi typography.ts) un elemento di `size` pixel
 * logici occupa fisicamente `size * scale` pixel, quindi va ridiviso per lo zoom corrente per
 * tornare nello stesso sistema di riferimento usato dal resto dei calcoli.
 */
export function useDragSurface({ onMove, onRelease }: UseDragSurfaceOptions) {
  const containerRef = useRef<View>(null);
  const onMoveRef = useRef(onMove);
  const onReleaseRef = useRef(onRelease);
  onMoveRef.current = onMove;
  onReleaseRef.current = onRelease;

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const node = containerRef.current as unknown as HTMLElement | null;
    if (!node) return;

    // Senza questo, su schermo tattile il browser può interpretare il tocco come uno scroll
    // della pagina (siamo dentro uno ScrollView) e non consegnare affatto i pointermove al
    // nostro codice: va impostato PRIMA che il tocco inizi, non dentro l'handler di pointerdown
    // (troppo tardi per quel tocco, il browser ha già deciso).
    const previousTouchAction = node.style.touchAction;
    node.style.touchAction = 'none';

    const reportPosition = (clientX: number, clientY: number) => {
      const rect = node.getBoundingClientRect();
      const scale = typographyState.scale || 1;
      onMoveRef.current((clientX - rect.left) / scale, (clientY - rect.top) / scale);
    };

    const handlePointerMove = (event: PointerEvent) => {
      event.preventDefault();
      reportPosition(event.clientX, event.clientY);
    };
    const stopDragging = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', stopDragging);
      window.removeEventListener('pointercancel', stopDragging);
      onReleaseRef.current?.();
    };
    const handlePointerDown = (event: PointerEvent) => {
      event.preventDefault();
      reportPosition(event.clientX, event.clientY);
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', stopDragging);
      window.addEventListener('pointercancel', stopDragging);
    };

    node.addEventListener('pointerdown', handlePointerDown);
    return () => {
      node.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', stopDragging);
      window.removeEventListener('pointercancel', stopDragging);
      node.style.touchAction = previousTouchAction;
    };
  }, []);

  const handleNativeMove = (evt: GestureResponderEvent) => {
    const { locationX, locationY } = evt.nativeEvent;
    onMove(locationX, locationY);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => Platform.OS !== 'web',
      onStartShouldSetPanResponderCapture: () => Platform.OS !== 'web',
      onMoveShouldSetPanResponder: () => Platform.OS !== 'web',
      onMoveShouldSetPanResponderCapture: () => Platform.OS !== 'web',
      onPanResponderGrant: handleNativeMove,
      onPanResponderMove: handleNativeMove,
      onPanResponderRelease: () => onRelease?.(),
      onPanResponderTerminate: () => onRelease?.(),
    })
  ).current;

  return { containerRef, panHandlers: Platform.OS === 'web' ? {} : panResponder.panHandlers };
}
