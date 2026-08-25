import { StyleSheet, View } from 'react-native';

const BLOB_SIZE = 320;

interface Blob {
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
}

/** Sfondi predefiniti: macchie di colore molto sfumate/poco visibili in uno o due angoli, mai foto. */
function blobPositionsFor(backgroundId: string): Blob[] {
  switch (backgroundId) {
    case 'top-right':
      return [{ top: -BLOB_SIZE * 0.4, right: -BLOB_SIZE * 0.4 }];
    case 'bottom-left':
      return [{ bottom: -BLOB_SIZE * 0.4, left: -BLOB_SIZE * 0.4 }];
    case 'corners':
      return [
        { top: -BLOB_SIZE * 0.45, left: -BLOB_SIZE * 0.45 },
        { bottom: -BLOB_SIZE * 0.45, right: -BLOB_SIZE * 0.45 },
      ];
    default:
      return [];
  }
}

export function ScreenBackground({ backgroundId, color }: { backgroundId: string; color: string }) {
  const positions = blobPositionsFor(backgroundId);
  if (positions.length === 0) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      {positions.map((position, i) => (
        <View
          key={i}
          style={[
            styles.blob,
            {
              backgroundColor: color,
              top: position.top,
              bottom: position.bottom,
              left: position.left,
              right: position.right,
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  blob: {
    position: 'absolute',
    width: BLOB_SIZE,
    height: BLOB_SIZE,
    borderRadius: BLOB_SIZE / 2,
    opacity: 0.08,
  },
});
