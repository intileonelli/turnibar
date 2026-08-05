import { Stack } from 'expo-router';
import { colors } from '@/src/components/shared/colors';

export default function NegozioLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTitleStyle: { color: colors.text },
        headerTintColor: colors.primary,
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Negozio' }} />
      <Stack.Screen name="ruoli" options={{ title: 'Ruoli' }} />
      <Stack.Screen name="turni-tipo" options={{ title: 'Turni tipo' }} />
    </Stack>
  );
}
