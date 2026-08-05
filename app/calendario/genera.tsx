import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/src/components/shared/ScreenContainer';
import { Button } from '@/src/components/shared/Button';
import { Card } from '@/src/components/shared/Card';
import { Badge } from '@/src/components/shared/Badge';
import { colors } from '@/src/components/shared/colors';
import { useScheduleStore } from '@/src/store/scheduleStore';
import { useSchedule } from '@/src/hooks/useSchedule';
import { useRoles } from '@/src/hooks/useRoles';
import { ScheduleResult } from '@/src/engine';
import { formatDateLong } from '@/src/utils/date';
import { WEEKDAY_LABELS } from '@/src/models';
import { strings } from '@/src/i18n/strings';

export default function GenerateScheduleScreen() {
  const router = useRouter();
  const { weekStartDate } = useScheduleStore();
  const { schedule, generate, generating } = useSchedule(weekStartDate);
  const { roles } = useRoles();
  const [result, setResult] = useState<ScheduleResult | null>(null);

  const roleName = (roleId: string) => roles.find((r) => r.id === roleId)?.name ?? roleId;

  const runGeneration = async () => {
    const generated = await generate();
    setResult(generated);
  };

  const handlePress = () => {
    if (schedule) {
      Alert.alert(strings.calendar.regenerateConfirmTitle, strings.calendar.regenerateConfirmMessage, [
        { text: strings.common.cancel, style: 'cancel' },
        { text: strings.common.confirm, onPress: runGeneration },
      ]);
    } else {
      runGeneration();
    }
  };

  return (
    <ScreenContainer>
      <Text style={styles.weekLabel}>
        {strings.calendar.week}: {formatDateLong(weekStartDate)}
      </Text>

      <Button label={strings.calendar.generate} onPress={handlePress} loading={generating} />

      {result && (
        <View style={styles.results}>
          <Card>
            <Text style={styles.resultTitle}>
              {result.assignments.length} assegnazioni generate
            </Text>
            {result.softViolationsCount > 0 && (
              <Text style={styles.resultDetail}>
                {result.softViolationsCount} turni non rispettano una preferenza (vincolo soft).
              </Text>
            )}
          </Card>

          <Text style={styles.sectionTitle}>{strings.calendar.unresolvedTitle}</Text>
          {result.unresolvedShifts.length === 0 ? (
            <Card>
              <Badge label={strings.calendar.unresolvedNone} tone="success" />
            </Card>
          ) : (
            result.unresolvedShifts.map((u, index) => (
              <Card key={index}>
                <Text style={styles.unresolvedTitle}>
                  {u.shiftName} · {WEEKDAY_LABELS[u.weekday]} {formatDateLong(u.date)}
                </Text>
                <Badge label={`${roleName(u.roleId)}: mancano ${u.missingCount}`} tone="danger" />
                <Text style={styles.unresolvedReason}>{u.reason}</Text>
              </Card>
            ))
          )}

          <View style={styles.backButton}>
            <Button label="Vai al calendario" variant="secondary" onPress={() => router.push('/calendario')} />
          </View>
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  weekLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  results: {
    marginTop: 20,
  },
  resultTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  resultDetail: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginTop: 16,
    marginBottom: 12,
  },
  unresolvedTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  unresolvedReason: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 6,
  },
  backButton: {
    marginTop: 12,
    marginBottom: 24,
  },
});
