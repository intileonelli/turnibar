import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { DbGate } from '@/src/components/shared/DbGate';
import { AuthGate } from '@/src/components/shared/AuthGate';
import { ThemeGate } from '@/src/components/shared/ThemeGate';
import { useCurrentAuth } from '@/src/context/AuthContext';
import { colors, themeState } from '@/src/components/shared/colors';
import { typographyState } from '@/src/components/shared/typography';
import { NAV_ICONS } from '@/src/constants/navIcons';
import { useThemeStore } from '@/src/store/themeStore';
import { strings } from '@/src/i18n/strings';

/**
 * Su web, "zoom" ingrandisce testo E controlli insieme in modo coerente (come lo zoom del
 * browser), a differenza di "transform: scale" che non fa ridisegnare il layout e causerebbe
 * sovrapposizioni. Nessun equivalente pratico su nativo, quindi lì la scala personale non ha
 * ancora effetto.
 */
function zoomStyle(): object {
  return Platform.OS === 'web' ? { zoom: typographyState.scale } : {};
}

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
    <View style={[{ flex: 1 }, zoomStyle()]}>
      <Tabs
        screenOptions={{
          // Stesso sfondo scelto per l'app (colore + trasparenza), non trasparente: essendo
          // fuori dalle singole schermate, l'intestazione e la barra in basso non possono usare
          // l'overlay di ScreenBackground, e un semplice "transparent" lascerebbe intravedere lo
          // sfondo chiaro di base della pagina, illeggibile con un colore testo bianco.
          headerStyle: { backgroundColor: themeState.chromeBackground },
          headerTitleStyle: { color: colors.text },
          tabBarStyle: { backgroundColor: themeState.chromeBackground },
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
    </View>
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
