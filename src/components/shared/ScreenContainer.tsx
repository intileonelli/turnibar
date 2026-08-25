import { forwardRef, PropsWithChildren } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent, ScrollView, StyleSheet, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, themeState } from './colors';
import { ScreenBackground } from './ScreenBackground';
import { useThemeStore } from '@/src/store/themeStore';

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
  // Ogni schermata deve ridisegnare lo sfondo non appena il tema cambia (in questa o in un'altra
  // schermata): senza questa sottoscrizione, `themeState` verrebbe letto solo al primo render.
  useThemeStore((s) => s.version);

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScreenBackground color={themeState.backgroundColor} opacity={themeState.backgroundOpacity} />
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
