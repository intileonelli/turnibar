import { Stack } from 'expo-router';
import { colors } from '@/src/components/shared/colors';

export default function DipendentiLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTitleStyle: { color: colors.text },
        headerTintColor: colors.primary,
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Dipendenti' }} />
      <Stack.Screen name="nuovo" options={{ title: 'Nuovo dipendente', presentation: 'modal' }} />
      <Stack.Screen name="[id]" options={{ title: 'Dipendente' }} />
    </Stack>
  );
}
