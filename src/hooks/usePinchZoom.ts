import { useEffect, useRef, useState } from 'react';
import { Platform, View } from 'react-native';

const MIN_SCALE = 0.6;
const MAX_SCALE = 2.2;

function touchDistance(touches: TouchList): number {
  const [a, b] = [touches[0], touches[1]];
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

/**
 * Zoom con due dita (pinch) su web, per la griglia turni: da telefono lo schermo è piccolo e
 * bisogna scorrere in entrambe le direzioni, quindi poter rimpicciolire/ingrandire con le dita
 * aiuta a vedere più o meno dettaglio. Da desktop non serve (già disponibile lo zoom del
 * browser con Ctrl+rotella), quindi qui non si aggiunge nulla.
 *
 * Eventi touch nativi del browser (non il livello sintetico di React Native) sullo stesso nodo
 * DOM, come già fatto in useDragSurface.ts: qui non c'è conflitto con lo scroll dello ScrollView
 * (a differenza del trascinamento a un dito), perché si interviene solo quando i tocchi attivi
 * sono esattamente due.
 */
export function usePinchZoom() {
  const containerRef = useRef<View>(null);
  const [scale, setScale] = useState(1);
  const scaleRef = useRef(1);
  const startDistanceRef = useRef(0);
  const startScaleRef = useRef(1);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const node = containerRef.current as unknown as HTMLElement | null;
    if (!node) return;

    // pan-x/pan-y: lo scorrimento a un dito resta quello normale del browser; togliendo
    // "pinch-zoom" dall'elenco si impedisce solo lo zoom nativo di tutta la pagina, lasciando
    // via libera al nostro gestore per il pizzico a due dita sulla sola griglia.
    const previousTouchAction = node.style.touchAction;
    node.style.touchAction = 'pan-x pan-y';

    const handleTouchStart = (event: TouchEvent) => {
      if (event.touches.length === 2) {
        startDistanceRef.current = touchDistance(event.touches);
        startScaleRef.current = scaleRef.current;
      }
    };
    const handleTouchMove = (event: TouchEvent) => {
      if (event.touches.length === 2 && startDistanceRef.current > 0) {
        event.preventDefault();
        const ratio = touchDistance(event.touches) / startDistanceRef.current;
        const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, startScaleRef.current * ratio));
        scaleRef.current = next;
        setScale(next);
      }
    };
    const endPinch = (event: TouchEvent) => {
      if (event.touches.length < 2) {
        startDistanceRef.current = 0;
      }
    };

    node.addEventListener('touchstart', handleTouchStart, { passive: true });
    node.addEventListener('touchmove', handleTouchMove, { passive: false });
    node.addEventListener('touchend', endPinch);
    node.addEventListener('touchcancel', endPinch);
    return () => {
      node.style.touchAction = previousTouchAction;
      node.removeEventListener('touchstart', handleTouchStart);
      node.removeEventListener('touchmove', handleTouchMove);
      node.removeEventListener('touchend', endPinch);
      node.removeEventListener('touchcancel', endPinch);
    };
  }, []);

  return { containerRef, scale };
}
