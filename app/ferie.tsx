import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { ScreenContainer } from '@/src/components/shared/ScreenContainer';
import { Chip } from '@/src/components/shared/Chip';
import { Button } from '@/src/components/shared/Button';
import { TextField } from '@/src/components/shared/TextField';
import { colors } from '@/src/components/shared/colors';
import { MonthlyLeaveCalendar } from '@/src/components/calendar/MonthlyLeaveCalendar';
import { useEmployees } from '@/src/hooks/useEmployees';
import { useAllTimeOff } from '@/src/hooks/useAllTimeOff';
import { useShopSettings } from '@/src/hooks/useShopSettings';
import { timeOffRepository, shopRepository } from '@/src/db/repositories';
import { showAlert } from '@/src/utils/alert';
import { formatDateLong } from '@/src/utils/date';
import { strings } from '@/src/i18n/strings';

const MONTH_LABELS = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre',
];

export default function LeaveScreen() {
  const { employees } = useEmployees();
  const { allTimeOff, reload: reloadAllTimeOff } = useAllTimeOff();
  const { settings, reload: reloadSettings } = useShopSettings();
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [maxPerDayInput, setMaxPerDayInput] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);

  const markedDates = useMemo(
    () =>
      new Set(
        allTimeOff.filter((t) => t.employeeId === selectedEmployeeId).map((t) => t.date)
      ),
    [allTimeOff, selectedEmployeeId]
  );

  const otherCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of allTimeOff) {
      if (t.employeeId === selectedEmployeeId) continue;
      map[t.date] = (map[t.date] ?? 0) + 1;
    }
    return map;
  }, [allTimeOff, selectedEmployeeId]);

  const goToPreviousMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const goToNextMonth = () => {
    if (month === 12) {
      setMonth(1);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  const handleDayPress = async (date: string) => {
    if (!selectedEmployeeId) return;
    const isCurrentlyMarked = markedDates.has(date);
    if (!isCurrentlyMarked && settings.maxDailyTimeOff !== undefined) {
      const otherCount = otherCounts[date] ?? 0;
      if (otherCount >= settings.maxDailyTimeOff) {
        showAlert(
          strings.leave.limitReachedTitle,
          strings.leave.limitReachedMessage(formatDateLong(date), otherCount, settings.maxDailyTimeOff)
        );
        return;
      }
    }
    await timeOffRepository.toggleTimeOff(selectedEmployeeId, date);
    await reloadAllTimeOff();
  };

  const startEditSettings = () => {
    setMaxPerDayInput(settings.maxDailyTimeOff !== undefined ? String(settings.maxDailyTimeOff) : '');
  };

  const handleSaveSettings = async () => {
    let maxPerDay: number | undefined;
    if (maxPerDayInput.trim()) {
      maxPerDay = Number(maxPerDayInput);
      if (!Number.isInteger(maxPerDay) || maxPerDay <= 0) {
        showAlert('Valore non valido', 'Inserisci un numero intero valido, oppure lascia il campo vuoto per nessun limite.');
        return;
      }
    }
    setSavingSettings(true);
    try {
      await shopRepository.updateShopSettings({ maxDailyTimeOff: maxPerDay });
      await reloadSettings();
    } finally {
      setSavingSettings(false);
    }
  };

  return (
    <ScreenContainer>
      <View style={styles.settingsBox}>
        <TextField
          label={strings.leave.maxPerDay}
          value={maxPerDayInput}
          onChangeText={setMaxPerDayInput}
          onFocus={startEditSettings}
          keyboardType="numeric"
          placeholder={settings.maxDailyTimeOff !== undefined ? String(settings.maxDailyTimeOff) : 'Nessun limite'}
        />
        <Text style={styles.hint}>{strings.leave.maxPerDayHint}</Text>
        <Button label={strings.common.save} variant="secondary" onPress={handleSaveSettings} loading={savingSettings} />
      </View>

      <Text style={styles.sectionTitle}>{strings.leave.selectEmployee}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.employeeRow}>
        {employees.map((employee) => (
          <Chip
            key={employee.id}
            label={employee.name}
            selected={selectedEmployeeId === employee.id}
            onPress={() => setSelectedEmployeeId(employee.id)}
          />
        ))}
      </ScrollView>

      {!selectedEmployeeId ? (
        <Text style={styles.empty}>{strings.leave.noEmployeeSelected}</Text>
      ) : (
        <>
          <View style={styles.monthNav}>
            <Button label="←" variant="secondary" onPress={goToPreviousMonth} />
            <Text style={styles.monthLabel}>
              {MONTH_LABELS[month - 1]} {year}
            </Text>
            <Button label="→" variant="secondary" onPress={goToNextMonth} />
          </View>

          <Text style={styles.hint}>{strings.leave.tapToToggle}</Text>

          <MonthlyLeaveCalendar
            year={year}
            month={month}
            markedDates={markedDates}
            otherCounts={otherCounts}
            maxPerDay={settings.maxDailyTimeOff}
            onDayPress={handleDayPress}
          />
        </>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  settingsBox: {
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  employeeRow: {
    marginBottom: 20,
  },
  empty: {
    textAlign: 'center',
    color: colors.textMuted,
    marginTop: 24,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  monthLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  hint: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 12,
  },
});
