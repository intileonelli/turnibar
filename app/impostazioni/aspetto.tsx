import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ScreenContainer } from '@/src/components/shared/ScreenContainer';
import { Card } from '@/src/components/shared/Card';
import { ColorWheelPicker } from '@/src/components/shared/ColorWheelPicker';
import { colors, applyTheme } from '@/src/components/shared/colors';
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

const DEFAULT_COLOR = '#4F46E5';

export default function AppearanceScreen() {
  const { settings, reload: reloadSettings } = useShopSettings();
  const bumpTheme = useThemeStore((s) => s.bump);

  // Anteprima immediata mentre si trascina sulla ruota: aggiorna solo lo stato locale del tema,
  // senza scrivere sul database (verrebbe chiamato troppo spesso durante il trascinamento).
  const previewTheme = (patch: Partial<ShopSettings>) => {
    applyTheme({ ...settings, ...patch });
    bumpTheme();
  };

  // Salva sul database: chiamato al rilascio del dito/mouse, o per le scelte "a tocco singolo"
  // come la posizione dello sfondo.
  const commitTheme = async (patch: Partial<ShopSettings>) => {
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
        <ColorWheelPicker
          initialValue={settings.primaryColor ?? DEFAULT_COLOR}
          onChange={(hex) => previewTheme({ primaryColor: hex })}
          onChangeComplete={(hex) => commitTheme({ primaryColor: hex })}
        />
      </Card>

      <Card>
        <Text style={styles.label}>Colore secondario</Text>
        <ColorWheelPicker
          initialValue={settings.accentColor ?? DEFAULT_COLOR}
          onChange={(hex) => previewTheme({ accentColor: hex })}
          onChangeComplete={(hex) => commitTheme({ accentColor: hex })}
        />
      </Card>

      <Card>
        <Text style={styles.label}>Colore sfondo</Text>
        <ColorWheelPicker
          initialValue={settings.backgroundColor ?? settings.primaryColor ?? DEFAULT_COLOR}
          onChange={(hex) => previewTheme({ backgroundColor: hex })}
          onChangeComplete={(hex) => commitTheme({ backgroundColor: hex })}
        />

        <Text style={[styles.label, styles.positionLabel]}>Posizione sfondo</Text>
        <View style={styles.chipsRow}>
          {BACKGROUND_OPTIONS.map((option) => {
            const selected = (settings.backgroundId ?? 'none') === option.id;
            return (
              <Pressable
                key={option.id}
                onPress={() => commitTheme({ backgroundId: option.id })}
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
    marginBottom: 12,
  },
  positionLabel: {
    marginTop: 20,
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
