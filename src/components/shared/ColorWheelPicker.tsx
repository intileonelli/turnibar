import { useMemo, useRef, useState } from 'react';
import { GestureResponderEvent, Image, PanResponder, StyleSheet, View } from 'react-native';
import { colors } from './colors';
import { hexToHsv, hsvToHex } from '@/src/utils/color';

const WHEEL_IMAGE = require('@/assets/color-wheel.png');

interface ColorWheelPickerProps {
  /** Colore iniziale (usato solo al primo render: da lì in poi il colore vive nello stato interno del picker). */
  initialValue: string;
  /** Chiamato continuamente durante il trascinamento, per un'anteprima immediata (non salvare qui: troppo frequente). */
  onChange: (hex: string) => void;
  /** Chiamato una volta al rilascio del dito/mouse: il momento giusto per salvare. */
  onChangeComplete: (hex: string) => void;
  size?: number;
}

const BRIGHTNESS_SEGMENTS = 28;

export function ColorWheelPicker({ initialValue, onChange, onChangeComplete, size = 220 }: ColorWheelPickerProps) {
  const [hsv, setHsv] = useState(() => hexToHsv(initialValue));
  const hsvRef = useRef(hsv);
  const radius = size / 2;

  const updateFromWheelTouch = (evt: GestureResponderEvent) => {
    const { locationX, locationY } = evt.nativeEvent;
    const dx = locationX - radius;
    const dy = locationY - radius;
    const dist = Math.min(Math.sqrt(dx * dx + dy * dy), radius);
    let hue = (Math.atan2(dy, dx) * 180) / Math.PI;
    if (hue < 0) hue += 360;
    const sat = dist / radius;
    const next = { h: hue, s: sat, v: hsvRef.current.v };
    hsvRef.current = next;
    setHsv(next);
    onChange(hsvToHex(next));
  };

  const wheelPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: updateFromWheelTouch,
      onPanResponderMove: updateFromWheelTouch,
      onPanResponderRelease: () => onChangeComplete(hsvToHex(hsvRef.current)),
      onPanResponderTerminate: () => onChangeComplete(hsvToHex(hsvRef.current)),
    })
  ).current;

  const trackWidth = size;
  const updateFromBrightnessTouch = (evt: GestureResponderEvent) => {
    const { locationX } = evt.nativeEvent;
    const v = Math.max(0, Math.min(1, locationX / trackWidth));
    const next = { ...hsvRef.current, v };
    hsvRef.current = next;
    setHsv(next);
    onChange(hsvToHex(next));
  };

  const brightnessPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: updateFromBrightnessTouch,
      onPanResponderMove: updateFromBrightnessTouch,
      onPanResponderRelease: () => onChangeComplete(hsvToHex(hsvRef.current)),
      onPanResponderTerminate: () => onChangeComplete(hsvToHex(hsvRef.current)),
    })
  ).current;

  const indicatorAngleRad = (hsv.h * Math.PI) / 180;
  const indicatorDist = hsv.s * radius;
  const indicatorX = radius + Math.cos(indicatorAngleRad) * indicatorDist;
  const indicatorY = radius + Math.sin(indicatorAngleRad) * indicatorDist;

  // Il gradiente di luminosità dipende da tonalità/saturazione correnti: nessuna libreria di
  // gradienti disponibile, quindi si approssima con tanti segmenti sottili (effetto sfumato).
  const brightnessSegments = useMemo(() => {
    const segmentWidth = trackWidth / BRIGHTNESS_SEGMENTS;
    return Array.from({ length: BRIGHTNESS_SEGMENTS }, (_, i) => {
      const v = i / (BRIGHTNESS_SEGMENTS - 1);
      return { color: hsvToHex({ h: hsv.h, s: hsv.s, v }), left: i * segmentWidth, width: segmentWidth + 1 };
    });
  }, [hsv.h, hsv.s, trackWidth]);

  const currentHex = hsvToHex(hsv);

  return (
    <View>
      <View style={{ width: size, height: size }}>
        <Image source={WHEEL_IMAGE} style={{ width: size, height: size }} resizeMode="contain" />
        <View style={StyleSheet.absoluteFill} {...wheelPanResponder.panHandlers}>
          <View
            pointerEvents="none"
            style={[
              styles.wheelIndicator,
              { left: indicatorX - 10, top: indicatorY - 10, backgroundColor: currentHex },
            ]}
          />
        </View>
      </View>

      <View style={[styles.brightnessTrack, { width: trackWidth }]} {...brightnessPanResponder.panHandlers}>
        {brightnessSegments.map((segment, i) => (
          <View
            key={i}
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: segment.left,
              width: segment.width,
              height: '100%',
              backgroundColor: segment.color,
            }}
          />
        ))}
        <View
          pointerEvents="none"
          style={[styles.brightnessHandle, { left: hsv.v * trackWidth - 9, backgroundColor: currentHex }]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wheelIndicator: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 3,
  },
  brightnessTrack: {
    height: 24,
    borderRadius: 12,
    marginTop: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  brightnessHandle: {
    position: 'absolute',
    top: 2,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 3,
  },
});
