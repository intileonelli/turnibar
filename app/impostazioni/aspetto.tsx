import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ScreenContainer } from '@/src/components/shared/ScreenContainer';
import { Card } from '@/src/components/shared/Card';
import { colors, THEME_COLOR_PALETTE, applyTheme } from '@/src/components/shared/colors';
import { useShopSettings } from '@/src/hooks/useShopSettings';
import { shopRepository } from '@/src/db/repositories';
import { ShopSettings } from '@/src/models';
import { showAlert } from '@/src/utils/alert';
import { useThemeStore } from '@/src/store/themeStore';

const BACKGROUND_OPTIONS: { id: string; label: string }[] = [
  { id: 'none', label: 'Nessuno' },
  { id: 'top-right', label: 'In alto a destra' },
  { id: 'bottom-left', label: 'In basso a sinistra' },
  { id: 'corners', label: 'Entrambi gli angoli' },
];

export default function AppearanceScreen() {
  const { settings, reload: reloadSettings } = useShopSettings();
  const bumpTheme = useThemeStore((s) => s.bump);

  const applyAndSaveTheme = async (patch: Partial<ShopSettings>) => {
    const next = { ...settings, ...patch };
    try {
      await shopRepository.updateShopSettings(next);
      applyTheme(next);
      bumpTheme();
      await reloadSettings();
    } catch (err) {
      showAlert('Errore', err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <ScreenContainer>
      <Text style={styles.hint}>
        Scegli i colori e lo sfondo dell'app. Le scelte si applicano subito a tutti gli account
        dell'azienda.
      </Text>

      <Card>
        <Text style={styles.label}>Colore principale</Text>
        <View style={styles.colorsRow}>
          {THEME_COLOR_PALETTE.map((swatch) => {
            const selected = (settings.primaryColor ?? THEME_COLOR_PALETTE[0]) === swatch;
            return (
              <Pressable
                key={swatch}
                onPress={() => applyAndSaveTheme({ primaryColor: swatch })}
                style={[
                  styles.colorSwatch,
                  { backgroundColor: swatch },
                  selected && { borderWidth: 3, borderColor: colors.text },
                ]}
              />
            );
          })}
        </View>

        <Text style={styles.label}>Colore secondario</Text>
        <View style={styles.colorsRow}>
          {THEME_COLOR_PALETTE.map((swatch) => {
            const selected = (settings.accentColor ?? THEME_COLOR_PALETTE[0]) === swatch;
            return (
              <Pressable
                key={swatch}
                onPress={() => applyAndSaveTheme({ accentColor: swatch })}
                style={[
                  styles.colorSwatch,
                  { backgroundColor: swatch },
                  selected && { borderWidth: 3, borderColor: colors.text },
                ]}
              />
            );
          })}
        </View>

        <Text style={styles.label}>Sfondo</Text>
        <View style={styles.chipsRow}>
          {BACKGROUND_OPTIONS.map((option) => {
            const selected = (settings.backgroundId ?? 'none') === option.id;
            return (
              <Pressable
                key={option.id}
                onPress={() => applyAndSaveTheme({ backgroundId: option.id })}
                style={[
                  styles.backgroundOption,
                  { backgroundColor: selected ? colors.primary : colors.surface, borderColor: colors.border },
                ]}
              >
                <Text style={[styles.backgroundOptionText, { color: selected ? '#fff' : colors.text }]}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Card>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  hint: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: 8,
  },
  colorsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  colorSwatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 10,
    marginBottom: 10,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  backgroundOption: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginRight: 8,
    marginBottom: 8,
  },
  backgroundOptionText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
