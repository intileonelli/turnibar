import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { ScreenContainer } from '@/src/components/shared/ScreenContainer';
import { Chip } from '@/src/components/shared/Chip';
import { Button } from '@/src/components/shared/Button';
import { colors } from '@/src/components/shared/colors';
import { MonthlyLeaveCalendar } from '@/src/components/calendar/MonthlyLeaveCalendar';
import { useEmployees } from '@/src/hooks/useEmployees';
import { useTimeOff } from '@/src/hooks/useTimeOff';
import { strings } from '@/src/i18n/strings';

const MONTH_LABELS = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre',
];

export default function LeaveScreen() {
  const { employees } = useEmployees();
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);

  const { timeOff, toggleDay } = useTimeOff(selectedEmployeeId);
  const markedDates = useMemo(() => new Set(timeOff.map((t) => t.date)), [timeOff]);

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

  return (
    <ScreenContainer>
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
            onDayPress={toggleDay}
          />
        </>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
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
