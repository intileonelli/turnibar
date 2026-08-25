import { useRef } from 'react';
import { GestureResponderEvent, PanResponder, Platform, View } from 'react-native';

/**
 * `measureInWindow` (usato per l'origine della superficie) restituisce coordinate relative al
 * VIEWPORT (getBoundingClientRect), mentre `pageX`/`pageY` dell'evento sono relative all'intera
 * PAGINA (includono lo scroll): se la pagina è scrollata, sottrarre l'una dall'altra senza
 * correggere introduce uno scarto costante pari allo scroll corrente, motivo per cui il pallino
 * finiva lontano dal punto toccato. Va sommato lo scroll corrente per riportarle allo stesso
 * sistema di riferimento (vedi commento di react-native-web su pageXOffset/pageYOffset in
 * Touchable). Su nativo lo scroll della pagina non esiste, quindi la correzione è 0.
 */
function pageScrollOffset(): { x: number; y: number } {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return { x: 0, y: 0 };
  return { x: window.scrollX ?? 0, y: window.scrollY ?? 0 };
}

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
    const scroll = pageScrollOffset();
    onMove(pageX - scroll.x - originRef.current.x, pageY - scroll.y - originRef.current.y);
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
