import { Stack } from 'expo-router';
import { colors } from '@/src/components/shared/colors';

export default function CalendarioLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTitleStyle: { color: colors.text },
        headerTintColor: colors.primary,
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Turni' }} />
      <Stack.Screen name="genera" options={{ title: 'Genera turni' }} />
    </Stack>
  );
}
