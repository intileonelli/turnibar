import { useRef } from 'react';
import { GestureResponderEvent, PanResponder, View } from 'react-native';

interface UseDragSurfaceOptions {
  /** Posizione del tocco relativa all'angolo in alto a sinistra della superficie, in pixel. */
  onMove: (relativeX: number, relativeY: number) => void;
  onRelease?: () => void;
}

/**
 * Gestione robusta del trascinamento (usata da ColorWheelPicker e Slider): misura la posizione
 * assoluta della superficie ad ogni inizio di trascinamento (measureInWindow) invece di fidarsi
 * di locationX/locationY dell'evento, che su web possono restare bloccati al punto di partenza
 * durante il movimento del mouse. Rivendica il gesto sia in fase di cattura che di bubbling per
 * evitare che uno ScrollView antenato lo intercetti.
 */
export function useDragSurface({ onMove, onRelease }: UseDragSurfaceOptions) {
  const containerRef = useRef<View>(null);
  const originRef = useRef({ x: 0, y: 0 });

  const handleMove = (evt: GestureResponderEvent) => {
    const { pageX, pageY } = evt.nativeEvent;
    onMove(pageX - originRef.current.x, pageY - originRef.current.y);
  };

  const handleGrant = (evt: GestureResponderEvent) => {
    containerRef.current?.measureInWindow((x, y) => {
      originRef.current = { x, y };
      handleMove(evt);
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderGrant: handleGrant,
      onPanResponderMove: handleMove,
      onPanResponderRelease: () => onRelease?.(),
      onPanResponderTerminate: () => onRelease?.(),
    })
  ).current;

  return { containerRef, panHandlers: panResponder.panHandlers };
}
