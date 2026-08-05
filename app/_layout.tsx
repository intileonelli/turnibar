import { Tabs } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { DbGate } from '@/src/components/shared/DbGate';
import { colors } from '@/src/components/shared/colors';
import { strings } from '@/src/i18n/strings';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <DbGate>
          <StatusBar style="dark" />
          <Tabs
            screenOptions={{
              headerStyle: { backgroundColor: colors.surface },
              headerTitleStyle: { color: colors.text },
              tabBarActiveTintColor: colors.primary,
              tabBarInactiveTintColor: colors.textMuted,
            }}
          >
            <Tabs.Screen name="index" options={{ title: strings.tabs.home }} />
            <Tabs.Screen name="dipendenti" options={{ title: strings.tabs.employees, headerShown: false }} />
            <Tabs.Screen name="negozio" options={{ title: strings.tabs.shop, headerShown: false }} />
            <Tabs.Screen name="calendario" options={{ title: strings.tabs.calendar, headerShown: false }} />
            <Tabs.Screen name="ferie" options={{ title: strings.tabs.leave }} />
            <Tabs.Screen name="+not-found" options={{ href: null }} />
          </Tabs>
        </DbGate>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
