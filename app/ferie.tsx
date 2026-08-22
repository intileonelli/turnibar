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
import { useCurrentAuth } from '@/src/context/AuthContext';

const MONTH_LABELS = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre',
];

export default function LeaveScreen() {
  const { session, profile } = useCurrentAuth();
  const isOwner = profile?.role === 'owner';
  const { employees } = useEmployees();
  const { allTimeOff, reload: reloadAllTimeOff } = useAllTimeOff();
  const { settings, reload: reloadSettings } = useShopSettings();
  const myEmployeeId = employees.find((e) => e.linkedUserId === session?.user.id)?.id ?? null;
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const effectiveEmployeeId = isOwner ? selectedEmployeeId : myEmployeeId;
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [maxPerDayInput, setMaxPerDayInput] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);

  const markedDates = useMemo(
    () =>
      new Set(
        allTimeOff.filter((t) => t.employeeId === effectiveEmployeeId).map((t) => t.date)
      ),
    [allTimeOff, effectiveEmployeeId]
  );

  const otherCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of allTimeOff) {
      if (t.employeeId === effectiveEmployeeId) continue;
      map[t.date] = (map[t.date] ?? 0) + 1;
    }
    return map;
  }, [allTimeOff, effectiveEmployeeId]);

  const employeeNameById = useMemo(
    () => new Map(employees.map((e) => [e.id, e.name])),
    [employees]
  );

  /** Chi è in ferie in ciascun giorno del mese in vista, per mostrare non solo "quanti" ma "chi". */
  const leaveByDay = useMemo(() => {
    const monthPrefix = `${year}-${String(month).padStart(2, '0')}`;
    const map = new Map<string, string[]>();
    for (const t of allTimeOff) {
      if (!t.date.startsWith(monthPrefix)) continue;
      const name = employeeNameById.get(t.employeeId);
      if (!name) continue;
      const list = map.get(t.date) ?? [];
      list.push(name);
      map.set(t.date, list);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [allTimeOff, employeeNameById, year, month]);

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
    if (!effectiveEmployeeId) return;
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
    await timeOffRepository.toggleTimeOff(effectiveEmployeeId, date);
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
      {isOwner && (
        <>
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
        </>
      )}

      {!effectiveEmployeeId ? (
        <Text style={styles.empty}>
          {isOwner
            ? strings.leave.noEmployeeSelected
            : 'Il tuo account non risulta collegato a nessun dipendente: chiedi al titolare.'}
        </Text>
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

          <Text style={styles.sectionTitle}>Chi è in ferie questo mese</Text>
          {leaveByDay.length === 0 ? (
            <Text style={styles.hint}>Nessuno è in ferie questo mese.</Text>
          ) : (
            leaveByDay.map(([date, names]) => (
              <View key={date} style={styles.leaveDayRow}>
                <Text style={styles.leaveDayDate}>{formatDateLong(date)}</Text>
                <Text style={styles.leaveDayNames}>{names.join(', ')}</Text>
              </View>
            ))
          )}
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
  leaveDayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  leaveDayDate: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  leaveDayNames: {
    fontSize: 13,
    color: colors.textMuted,
    flexShrink: 1,
    textAlign: 'right',
  },
});
