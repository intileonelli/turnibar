import { Tabs } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { DbGate } from '@/src/components/shared/DbGate';
import { AuthGate } from '@/src/components/shared/AuthGate';
import { useCurrentAuth } from '@/src/context/AuthContext';
import { colors } from '@/src/components/shared/colors';
import { strings } from '@/src/i18n/strings';

function AppTabs() {
  const { profile } = useCurrentAuth();
  const isOwner = profile?.role === 'owner';

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTitleStyle: { color: colors.text },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
      }}
    >
      <Tabs.Screen name="index" options={{ title: strings.tabs.home }} />
      <Tabs.Screen
        name="dipendenti"
        options={{ title: strings.tabs.employees, headerShown: false, href: isOwner ? undefined : null }}
      />
      <Tabs.Screen
        name="negozio"
        options={{ title: strings.tabs.shop, headerShown: false, href: isOwner ? undefined : null }}
      />
      <Tabs.Screen name="calendario" options={{ title: strings.tabs.calendar, headerShown: false }} />
      <Tabs.Screen name="ferie" options={{ title: strings.tabs.leave }} />
      <Tabs.Screen name="migrazione-dati" options={{ href: null }} />
      <Tabs.Screen name="+not-found" options={{ href: null }} />
    </Tabs>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthGate>
          <DbGate>
            <StatusBar style="dark" />
            <AppTabs />
          </DbGate>
        </AuthGate>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
