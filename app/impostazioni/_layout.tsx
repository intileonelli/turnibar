import { Stack } from 'expo-router';
import { colors } from '@/src/components/shared/colors';

export default function ImpostazioniLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTitleStyle: { color: colors.text },
        headerTintColor: colors.primary,
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Impostazioni' }} />
      <Stack.Screen name="cambia-password" options={{ title: 'Cambia password' }} />
      <Stack.Screen name="accessi" options={{ title: 'Accessi dipendenti' }} />
      <Stack.Screen name="aspetto" options={{ title: 'Aspetto' }} />
      <Stack.Screen name="migrazione-dati" options={{ title: 'Importa dati locali' }} />
    </Stack>
  );
}
