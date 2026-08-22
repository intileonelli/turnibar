import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/src/components/shared/ScreenContainer';
import { Button } from '@/src/components/shared/Button';
import { TextField } from '@/src/components/shared/TextField';
import { SwitchRow } from '@/src/components/shared/SwitchRow';
import { Card } from '@/src/components/shared/Card';
import { colors } from '@/src/components/shared/colors';
import { useOpeningHours } from '@/src/hooks/useOpeningHours';
import { shopRepository } from '@/src/db/repositories';
import { OpeningHours, WEEKDAY_LABELS } from '@/src/models';
import { strings } from '@/src/i18n/strings';

export default function ShopScreen() {
  const router = useRouter();
  const { openingHours, reload } = useOpeningHours();
  const [draft, setDraft] = useState<OpeningHours[]>([]);
  const [saving, setSaving] = useState(false);

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
          <Button label="Accessi dipendenti" variant="secondary" onPress={() => router.push('/negozio/accessi')} />
        </View>
      </View>

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
});
