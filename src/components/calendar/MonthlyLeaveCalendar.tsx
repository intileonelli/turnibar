import { Pressable, StyleSheet, Text, View } from 'react-native';
import { WEEKDAY_LABELS_SHORT, WEEKDAYS } from '@/src/models';
import { daysInMonth } from '@/src/utils/date';
import { colors } from '@/src/components/shared/colors';

interface MonthlyLeaveCalendarProps {
  year: number;
  /** Mese 1-12. */
  month: number;
  markedDates: Set<string>;
  onDayPress: (date: string) => void;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** Giorno della settimana ISO (1 = lunedì ... 7 = domenica) del primo giorno del mese. */
function firstWeekdayOfMonth(year: number, month: number): number {
  const jsDay = new Date(year, month - 1, 1).getDay(); // 0 = domenica
  return jsDay === 0 ? 7 : jsDay;
}

export function MonthlyLeaveCalendar({ year, month, markedDates, onDayPress }: MonthlyLeaveCalendarProps) {
  const totalDays = daysInMonth(year, month);
  const leadingBlanks = firstWeekdayOfMonth(year, month) - 1;
  const cells: (number | null)[] = [
    ...Array.from({ length: leadingBlanks }, () => null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  return (
    <View>
      <View style={styles.headerRow}>
        {WEEKDAYS.map((weekday) => (
          <Text key={weekday} style={styles.headerCell}>
            {WEEKDAY_LABELS_SHORT[weekday]}
          </Text>
        ))}
      </View>

      {weeks.map((week, weekIndex) => (
        <View key={weekIndex} style={styles.weekRow}>
          {week.map((day, dayIndex) => {
            if (day === null) return <View key={dayIndex} style={styles.dayCell} />;
            const dateStr = `${year}-${pad(month)}-${pad(day)}`;
            const isMarked = markedDates.has(dateStr);
            return (
              <Pressable
                key={dayIndex}
                onPress={() => onDayPress(dateStr)}
                style={[styles.dayCell, styles.dayCellPressable, isMarked && styles.dayCellMarked]}
              >
                <Text style={[styles.dayText, isMarked && styles.dayTextMarked]}>{day}</Text>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  headerCell: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
  },
  weekRow: {
    flexDirection: 'row',
  },
  dayCell: {
    flex: 1,
    aspectRatio: 1,
    margin: 2,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCellPressable: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dayCellMarked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dayText: {
    fontSize: 14,
    color: colors.text,
  },
  dayTextMarked: {
    color: '#fff',
    fontWeight: '700',
  },
});
