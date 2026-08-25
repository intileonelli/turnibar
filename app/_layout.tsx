import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { DbGate } from '@/src/components/shared/DbGate';
import { AuthGate } from '@/src/components/shared/AuthGate';
import { ThemeGate } from '@/src/components/shared/ThemeGate';
import { useCurrentAuth } from '@/src/context/AuthContext';
import { colors } from '@/src/components/shared/colors';
import { NAV_ICONS } from '@/src/constants/navIcons';
import { useThemeStore } from '@/src/store/themeStore';
import { strings } from '@/src/i18n/strings';

function tabIcon(name: keyof typeof Ionicons.glyphMap) {
  return ({ color, size }: { color: string; size: number }) => (
    <Ionicons name={name} size={size} color={color} />
  );
}

function AppTabs() {
  const { profile } = useCurrentAuth();
  // Sottoscrive lo themeStore: quando qualcuno cambia i colori dell'app (in qualsiasi
  // schermata), questo componente si ri-renderizza rileggendo `colors`, aggiornando anche la
  // barra di navigazione (che altrimenti resterebbe con i vecchi colori finché l'app non viene
  // ricaricata, dato che screenOptions viene valutato solo quando AppTabs ri-renderizza).
  useThemeStore((s) => s.version);
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
      <Tabs.Screen
        name="index"
        options={{ title: strings.tabs.home, tabBarIcon: tabIcon(NAV_ICONS.home) }}
      />
      <Tabs.Screen
        name="dipendenti"
        options={{
          title: strings.tabs.employees,
          headerShown: false,
          href: isOwner ? undefined : null,
          tabBarIcon: tabIcon(NAV_ICONS.dipendenti),
        }}
      />
      <Tabs.Screen
        name="negozio"
        options={{
          title: strings.tabs.shop,
          headerShown: false,
          href: isOwner ? undefined : null,
          tabBarIcon: tabIcon(NAV_ICONS.negozio),
        }}
      />
      <Tabs.Screen
        name="calendario"
        options={{ title: strings.tabs.calendar, headerShown: false, tabBarIcon: tabIcon(NAV_ICONS.calendario) }}
      />
      <Tabs.Screen name="ferie" options={{ title: strings.tabs.leave, tabBarIcon: tabIcon(NAV_ICONS.ferie) }} />
      <Tabs.Screen name="impostazioni" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="+not-found" options={{ href: null }} />
    </Tabs>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthGate>
          <ThemeGate>
            <DbGate>
              <StatusBar style="dark" />
              <AppTabs />
            </DbGate>
          </ThemeGate>
        </AuthGate>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
