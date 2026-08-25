import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { colors } from './colors';
import { useDragSurface } from '@/src/hooks/useDragSurface';

interface SliderProps {
  /** Valore iniziale normalizzato 0-1 (usato solo al primo render: da lì il valore vive nello stato interno). */
  initialValue: number;
  /** Chiamato continuamente durante il trascinamento, con il valore 0-1. */
  onChange: (value: number) => void;
  /** Chiamato una volta al rilascio del dito/mouse: il momento giusto per salvare. */
  onChangeComplete: (value: number) => void;
  width?: number;
  trackColor?: string;
}

export function Slider({ initialValue, onChange, onChangeComplete, width = 260, trackColor }: SliderProps) {
  const [value, setValue] = useState(() => Math.max(0, Math.min(1, initialValue)));
  const valueRef = useRef(value);

  const updateFromTouch = (x: number) => {
    const next = Math.max(0, Math.min(1, x / width));
    valueRef.current = next;
    setValue(next);
    onChange(next);
  };

  const drag = useDragSurface({
    onMove: updateFromTouch,
    onRelease: () => onChangeComplete(valueRef.current),
  });

  return (
    <View ref={drag.containerRef} style={[styles.track, { width, backgroundColor: trackColor ?? colors.border }]} {...drag.panHandlers}>
      <View pointerEvents="none" style={[styles.fill, { width: value * width, backgroundColor: colors.primary }]} />
      <View pointerEvents="none" style={[styles.handle, { left: value * width - 9 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 24,
    borderRadius: 12,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    opacity: 0.35,
  },
  handle: {
    position: 'absolute',
    top: 2,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 3,
    borderColor: '#fff',
    backgroundColor: colors.primary,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 3,
  },
});
