import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { ScreenContainer } from '@/src/components/shared/ScreenContainer';
import { Chip } from '@/src/components/shared/Chip';
import { Button } from '@/src/components/shared/Button';
import { TextField } from '@/src/components/shared/TextField';
import { colors } from '@/src/components/shared/colors';
import { MonthlyLeaveCalendar } from '@/src/components/calendar/MonthlyLeaveCalendar';
import { DayAbsenceModal, DayAbsenceModalProps, DaySelection } from '@/src/components/calendar/DayAbsenceModal';
import { EmptyState } from '@/src/components/shared/EmptyState';
import { useEmployees } from '@/src/hooks/useEmployees';
import { useAllTimeOff } from '@/src/hooks/useAllTimeOff';
import { useAllCategoryRequests } from '@/src/hooks/useAllCategoryRequests';
import { useShiftCategories } from '@/src/hooks/useShiftCategories';
import { useShopSettings } from '@/src/hooks/useShopSettings';
import { timeOffRepository, categoryRequestRepository, shopRepository } from '@/src/db/repositories';
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
  const { allCategoryRequests, reload: reloadAllCategoryRequests } = useAllCategoryRequests();
  const { categories } = useShiftCategories();
  const { settings, reload: reloadSettings } = useShopSettings();
  const myEmployeeId = employees.find((e) => e.linkedUserId === session?.user.id)?.id ?? null;
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const effectiveEmployeeId = isOwner ? selectedEmployeeId : myEmployeeId;
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [maxPerDayInput, setMaxPerDayInput] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [savingDay, setSavingDay] = useState(false);
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
  const [multiModalOpen, setMultiModalOpen] = useState(false);

  const markedDates = useMemo(
    () =>
      new Set(
        allTimeOff
          .filter((t) => t.employeeId === effectiveEmployeeId && !t.startTime)
          .map((t) => t.date)
      ),
    [allTimeOff, effectiveEmployeeId]
  );

  const partialDates = useMemo(
    () =>
      new Set(
        allTimeOff
          .filter((t) => t.employeeId === effectiveEmployeeId && t.startTime)
          .map((t) => t.date)
      ),
    [allTimeOff, effectiveEmployeeId]
  );

  const categoryRequestDates = useMemo(
    () =>
      new Set(
        allCategoryRequests.filter((r) => r.employeeId === effectiveEmployeeId).map((r) => r.date)
      ),
    [allCategoryRequests, effectiveEmployeeId]
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

  const categoryNameById = useMemo(
    () => new Map(categories.map((c) => [c.id, c.name])),
    [categories]
  );

  /** Chi è assente in ciascun giorno del mese in vista, per mostrare non solo "quanti" ma "chi". */
  const leaveByDay = useMemo(() => {
    const monthPrefix = `${year}-${String(month).padStart(2, '0')}`;
    const map = new Map<string, string[]>();
    for (const t of allTimeOff) {
      if (!t.date.startsWith(monthPrefix)) continue;
      const name = employeeNameById.get(t.employeeId);
      if (!name) continue;
      const label = t.startTime && t.endTime ? `${name} (${t.startTime}-${t.endTime})` : name;
      const list = map.get(t.date) ?? [];
      list.push(label);
      map.set(t.date, list);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [allTimeOff, employeeNameById, year, month]);

  /** Fasce orarie richieste in ciascun giorno del mese in vista. */
  const categoryRequestsByDay = useMemo(() => {
    const monthPrefix = `${year}-${String(month).padStart(2, '0')}`;
    const map = new Map<string, string[]>();
    for (const r of allCategoryRequests) {
      if (!r.date.startsWith(monthPrefix)) continue;
      const name = employeeNameById.get(r.employeeId);
      const categoryName = categoryNameById.get(r.categoryId);
      if (!name || !categoryName) continue;
      const list = map.get(r.date) ?? [];
      list.push(`${name} (${categoryName})`);
      map.set(r.date, list);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [allCategoryRequests, employeeNameById, categoryNameById, year, month]);

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

  const toggleMultiSelectMode = () => {
    setMultiSelectMode((prev) => !prev);
    setSelectedDates(new Set());
  };

  const handleDayPress = (date: string) => {
    if (!effectiveEmployeeId) return;
    if (multiSelectMode) {
      setSelectedDates((prev) => {
        const next = new Set(prev);
        if (next.has(date)) next.delete(date);
        else next.add(date);
        return next;
      });
      return;
    }
    setSelectedDate(date);
  };

  // Permesso/ferie e fascia richiesta sono alternativi: applicare l'una cancella sempre l'altra,
  // così non restano mai combinate per errore per lo stesso giorno. Condivisa tra il salvataggio
  // di un solo giorno e l'applicazione a più giorni selezionati.
  const applySelectionToDate = async (employeeId: string, date: string, selection: DaySelection): Promise<void> => {
    if (selection.mode === 'none') {
      await Promise.all([
        timeOffRepository.removeTimeOff(employeeId, date),
        categoryRequestRepository.removeCategoryRequest(employeeId, date),
      ]);
    } else if (selection.mode === 'full') {
      await Promise.all([
        timeOffRepository.addTimeOff(employeeId, date),
        categoryRequestRepository.removeCategoryRequest(employeeId, date),
      ]);
    } else if (selection.mode === 'partial') {
      await Promise.all([
        timeOffRepository.setPermit(employeeId, date, selection.startTime, selection.endTime),
        categoryRequestRepository.removeCategoryRequest(employeeId, date),
      ]);
    } else {
      await Promise.all([
        timeOffRepository.removeTimeOff(employeeId, date),
        categoryRequestRepository.setCategoryRequest(employeeId, date, selection.categoryId),
      ]);
    }
  };

  const handleSaveDay: DayAbsenceModalProps['onSave'] = async (selection) => {
    if (!effectiveEmployeeId || !selectedDate) return;

    const isAbsenceChoice = selection.mode === 'full' || selection.mode === 'partial';
    const wasAbsent = markedDates.has(selectedDate) || partialDates.has(selectedDate);
    if (!wasAbsent && isAbsenceChoice && settings.maxDailyTimeOff !== undefined) {
      const otherCount = otherCounts[selectedDate] ?? 0;
      if (otherCount >= settings.maxDailyTimeOff) {
        showAlert(
          strings.leave.limitReachedTitle,
          strings.leave.limitReachedMessage(formatDateLong(selectedDate), otherCount, settings.maxDailyTimeOff)
        );
        return;
      }
    }

    setSavingDay(true);
    try {
      await applySelectionToDate(effectiveEmployeeId, selectedDate, selection);
      await Promise.all([reloadAllTimeOff(), reloadAllCategoryRequests()]);
      setSelectedDate(null);
    } finally {
      setSavingDay(false);
    }
  };

  const handleSaveMultipleDays: DayAbsenceModalProps['onSave'] = async (selection) => {
    if (!effectiveEmployeeId || selectedDates.size === 0) return;

    const isAbsenceChoice = selection.mode === 'full' || selection.mode === 'partial';
    const datesToApply: string[] = [];
    const skippedDates: string[] = [];
    for (const date of selectedDates) {
      const wasAbsent = markedDates.has(date) || partialDates.has(date);
      const otherCount = otherCounts[date] ?? 0;
      if (!wasAbsent && isAbsenceChoice && settings.maxDailyTimeOff !== undefined && otherCount >= settings.maxDailyTimeOff) {
        skippedDates.push(date);
      } else {
        datesToApply.push(date);
      }
    }

    setSavingDay(true);
    try {
      await Promise.all(datesToApply.map((date) => applySelectionToDate(effectiveEmployeeId, date, selection)));
      await Promise.all([reloadAllTimeOff(), reloadAllCategoryRequests()]);
      setMultiModalOpen(false);
      setSelectedDates(new Set());
      setMultiSelectMode(false);
      if (skippedDates.length > 0) {
        showAlert(
          strings.leave.limitReachedTitle,
          `Limite massimo raggiunto per ${skippedDates.length} giorno/i, non modificati: ${skippedDates
            .sort()
            .map(formatDateLong)
            .join(', ')}.`
        );
      }
    } finally {
      setSavingDay(false);
    }
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
      await shopRepository.updateShopSettings({ ...settings, maxDailyTimeOff: maxPerDay });
      await reloadSettings();
    } catch (err) {
      showAlert('Errore', err instanceof Error ? err.message : String(err));
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

          <Text style={styles.hint}>
            {multiSelectMode
              ? 'Tocca i giorni da modificare insieme, poi applica una scelta a tutti.'
              : 'Tocca un giorno per impostare ferie, permesso o una fascia oraria richiesta.'}
          </Text>

          <View style={styles.multiSelectRow}>
            <Button
              label={multiSelectMode ? 'Annulla selezione multipla' : 'Seleziona più giorni'}
              variant="secondary"
              onPress={toggleMultiSelectMode}
            />
            {multiSelectMode && selectedDates.size > 0 && (
              <Button label={`Applica a ${selectedDates.size} giorni`} onPress={() => setMultiModalOpen(true)} />
            )}
          </View>

          <MonthlyLeaveCalendar
            year={year}
            month={month}
            markedDates={markedDates}
            partialDates={partialDates}
            categoryRequestDates={categoryRequestDates}
            otherCounts={otherCounts}
            maxPerDay={settings.maxDailyTimeOff}
            selectedDates={selectedDates}
            onDayPress={handleDayPress}
          />

          <Text style={styles.sectionTitle}>Chi è assente questo mese</Text>
          {leaveByDay.length === 0 ? (
            <EmptyState icon="🌴" title="Nessuno è assente questo mese" />
          ) : (
            leaveByDay.map(([date, names]) => (
              <View key={date} style={styles.leaveDayRow}>
                <Text style={styles.leaveDayDate}>{formatDateLong(date)}</Text>
                <Text style={styles.leaveDayNames}>{names.join(', ')}</Text>
              </View>
            ))
          )}

          <Text style={styles.sectionTitle}>Fasce richieste questo mese</Text>
          {categoryRequestsByDay.length === 0 ? (
            <Text style={styles.hint}>Nessuna fascia richiesta questo mese.</Text>
          ) : (
            categoryRequestsByDay.map(([date, names]) => (
              <View key={date} style={styles.leaveDayRow}>
                <Text style={styles.leaveDayDate}>{formatDateLong(date)}</Text>
                <Text style={styles.leaveDayNames}>{names.join(', ')}</Text>
              </View>
            ))
          )}
        </>
      )}

      <DayAbsenceModal
        visible={selectedDate !== null || multiModalOpen}
        date={selectedDate}
        dates={multiModalOpen ? [...selectedDates] : undefined}
        currentTimeOff={allTimeOff.find((t) => t.employeeId === effectiveEmployeeId && t.date === selectedDate)}
        currentCategoryRequest={allCategoryRequests.find(
          (r) => r.employeeId === effectiveEmployeeId && r.date === selectedDate
        )}
        categories={categories}
        saving={savingDay}
        onClose={() => {
          setSelectedDate(null);
          setMultiModalOpen(false);
        }}
        onSave={multiModalOpen ? handleSaveMultipleDays : handleSaveDay}
      />
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
  multiSelectRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
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
