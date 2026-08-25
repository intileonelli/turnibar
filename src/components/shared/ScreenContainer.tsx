import { forwardRef, PropsWithChildren } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent, ScrollView, StyleSheet, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, themeState } from './colors';
import { ScreenBackground } from './ScreenBackground';

interface ScreenContainerProps extends PropsWithChildren {
  scroll?: boolean;
  style?: ViewStyle;
  onScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  scrollEventThrottle?: number;
}

export const ScreenContainer = forwardRef<ScrollView, ScreenContainerProps>(function ScreenContainer(
  { children, scroll = true, style, onScroll, scrollEventThrottle },
  ref
) {
  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScreenBackground backgroundId={themeState.backgroundId} />
      {scroll ? (
        <ScrollView
          ref={ref}
          contentContainerStyle={[styles.content, style]}
          onScroll={onScroll}
          scrollEventThrottle={scrollEventThrottle}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.content, styles.flex, style]}>{children}</View>
      )}
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
  },
  flex: {
    flex: 1,
  },
});
