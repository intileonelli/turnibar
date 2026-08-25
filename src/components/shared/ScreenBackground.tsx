import { StyleSheet, View } from 'react-native';
import { colors } from './colors';

const BLOB_SIZE = 320;

interface Blob {
  color: string;
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
}

/** Sfondi predefiniti: macchie di colore molto sfumate/poco visibili in uno o due angoli, mai foto. */
function blobsFor(backgroundId: string): Blob[] {
  switch (backgroundId) {
    case 'top-right':
      return [{ color: colors.primary, top: -BLOB_SIZE * 0.4, right: -BLOB_SIZE * 0.4 }];
    case 'bottom-left':
      return [{ color: colors.accent, bottom: -BLOB_SIZE * 0.4, left: -BLOB_SIZE * 0.4 }];
    case 'corners':
      return [
        { color: colors.accent, top: -BLOB_SIZE * 0.45, left: -BLOB_SIZE * 0.45 },
        { color: colors.primary, bottom: -BLOB_SIZE * 0.45, right: -BLOB_SIZE * 0.45 },
      ];
    default:
      return [];
  }
}

export function ScreenBackground({ backgroundId }: { backgroundId: string }) {
  const blobs = blobsFor(backgroundId);
  if (blobs.length === 0) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      {blobs.map((blob, i) => (
        <View
          key={i}
          style={[
            styles.blob,
            {
              backgroundColor: blob.color,
              top: blob.top,
              bottom: blob.bottom,
              left: blob.left,
              right: blob.right,
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
