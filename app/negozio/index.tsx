import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/src/components/shared/ScreenContainer';
import { Button } from '@/src/components/shared/Button';
import { TextField } from '@/src/components/shared/TextField';
import { SwitchRow } from '@/src/components/shared/SwitchRow';
import { Card } from '@/src/components/shared/Card';
import { colors, THEME_COLOR_PALETTE, applyTheme } from '@/src/components/shared/colors';
import { useOpeningHours } from '@/src/hooks/useOpeningHours';
import { useShopSettings } from '@/src/hooks/useShopSettings';
import { shopRepository } from '@/src/db/repositories';
import { OpeningHours, ShopSettings, WEEKDAY_LABELS } from '@/src/models';
import { showAlert } from '@/src/utils/alert';
import { strings } from '@/src/i18n/strings';
import { useThemeStore } from '@/src/store/themeStore';

const BACKGROUND_OPTIONS: { id: string; label: string }[] = [
  { id: 'none', label: 'Nessuno' },
  { id: 'top-right', label: 'In alto a destra' },
  { id: 'bottom-left', label: 'In basso a sinistra' },
  { id: 'corners', label: 'Entrambi gli angoli' },
];

export default function ShopScreen() {
  const router = useRouter();
  const { openingHours, reload } = useOpeningHours();
  const { settings, reload: reloadSettings } = useShopSettings();
  const bumpTheme = useThemeStore((s) => s.bump);
  const [draft, setDraft] = useState<OpeningHours[]>([]);
  const [saving, setSaving] = useState(false);

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

  useEffect(() => {
    setDraft(openingHours);
  }, [openingHours]);

  const updateEntry = (id: string, patch: Partial<OpeningHours>) => {
    setDraft((prev) => prev.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await Promise.all(draft.map((entry) => shopRepository.updateOpeningHours(entry)));
      await reload();
    } finally {
      setSaving(false);
    }
  };

  const handleToggleMultipleShifts = async (value: boolean) => {
    try {
      await shopRepository.updateShopSettings({ ...settings, allowMultipleShiftsPerDay: value });
      await reloadSettings();
    } catch (err) {
      showAlert('Errore', err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <ScreenContainer>
      <View style={styles.navRow}>
        <View style={styles.navButton}>
          <Button label={strings.roles.title} variant="secondary" onPress={() => router.push('/negozio/ruoli')} />
        </View>
        <View style={styles.navButton}>
          <Button
            label={strings.shop.shiftTemplates}
            variant="secondary"
            onPress={() => router.push('/negozio/turni-tipo')}
          />
        </View>
        <View style={styles.navButton}>
          <Button label="Fasce orarie" variant="secondary" onPress={() => router.push('/negozio/fasce-orarie')} />
        </View>
        <View style={styles.navButton}>
          <Button label="Accessi dipendenti" variant="secondary" onPress={() => router.push('/negozio/accessi')} />
        </View>
      </View>

      <Text style={styles.sectionTitle}>Turni</Text>
      <Card>
        <SwitchRow
          label="Permetti più turni nello stesso giorno per lo stesso dipendente"
          value={settings.allowMultipleShiftsPerDay}
          onValueChange={handleToggleMultipleShifts}
        />
        <Text style={styles.hint}>
          Se disattivo (consigliato per la maggior parte delle attività), un dipendente non viene
          mai messo in due turni nello stesso giorno durante la generazione automatica, anche se
          gli orari non si sovrappongono.
        </Text>
      </Card>

      <Text style={styles.sectionTitle}>Aspetto</Text>
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

      <Text style={styles.sectionTitle}>{strings.shop.openingHours}</Text>

      {draft.map((entry) => (
        <Card key={entry.id}>
          <Text style={styles.weekday}>{WEEKDAY_LABELS[entry.weekday]}</Text>
          <SwitchRow
            label={strings.shop.closed}
            value={entry.closed}
            onValueChange={(value) => updateEntry(entry.id, { closed: value })}
          />
          {!entry.closed && (
            <View style={styles.timeRow}>
              <View style={styles.timeField}>
                <TextField
                  label={strings.shop.openTime}
                  value={entry.openTime}
                  onChangeText={(value) => updateEntry(entry.id, { openTime: value })}
                  placeholder="09:00"
                />
              </View>
              <View style={styles.timeField}>
                <TextField
                  label={strings.shop.closeTime}
                  value={entry.closeTime}
                  onChangeText={(value) => updateEntry(entry.id, { closeTime: value })}
                  placeholder="20:00"
                />
              </View>
            </View>
          )}
        </Card>
      ))}

      <View style={styles.saveButton}>
        <Button label={strings.common.save} onPress={handleSave} loading={saving} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  navRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  navButton: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  hint: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: -4,
  },
  weekday: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  timeRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  timeField: {
    flex: 1,
  },
  saveButton: {
    marginTop: 8,
    marginBottom: 24,
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
