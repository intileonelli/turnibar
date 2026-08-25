import { Pressable, StyleSheet, Text, View } from 'react-native';
import { WEEKDAY_LABELS_SHORT, WEEKDAYS } from '@/src/models';
import { daysInMonth } from '@/src/utils/date';
import { colors } from '@/src/components/shared/colors';

interface MonthlyLeaveCalendarProps {
  year: number;
  /** Mese 1-12. */
  month: number;
  /** Giorni di ferie (intera giornata) del dipendente selezionato. */
  markedDates: Set<string>;
  /** Giorni di permesso (fascia oraria) del dipendente selezionato. */
  partialDates?: Set<string>;
  /** Giorni con una fascia oraria richiesta dal dipendente selezionato. */
  categoryRequestDates?: Set<string>;
  /** Numero di ALTRI dipendenti (diversi da quello selezionato) in ferie/permesso per ogni data. */
  otherCounts?: Record<string, number>;
  /** Limite massimo di dipendenti in ferie nello stesso giorno, se impostato. */
  maxPerDay?: number;
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

export function MonthlyLeaveCalendar({
  year,
  month,
  markedDates,
  partialDates = new Set(),
  categoryRequestDates = new Set(),
  otherCounts = {},
  maxPerDay,
  onDayPress,
}: MonthlyLeaveCalendarProps) {
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
            const isFullDay = markedDates.has(dateStr);
            const isPartial = partialDates.has(dateStr);
            const isAbsent = isFullDay || isPartial;
            const hasCategoryRequest = categoryRequestDates.has(dateStr);
            const otherCount = otherCounts[dateStr] ?? 0;
            const totalCount = otherCount + (isAbsent ? 1 : 0);
            const isFull = maxPerDay !== undefined && totalCount >= maxPerDay;
            return (
              <Pressable
                key={dayIndex}
                onPress={() => onDayPress(dateStr)}
                style={[
                  styles.dayCell,
                  styles.dayCellPressable,
                  isFull && !isAbsent && styles.dayCellFull,
                  isPartial && styles.dayCellPartial,
                  isFullDay && styles.dayCellMarked,
                ]}
              >
                <Text style={[styles.dayText, isFullDay && styles.dayTextMarked]}>{day}</Text>
                {hasCategoryRequest && <View style={styles.requestDot} />}
                {otherCount > 0 && (
                  <View style={[styles.badge, isFull && styles.badgeFull]}>
                    <Text style={styles.badgeText}>{otherCount}</Text>
                  </View>
                )}
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
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
  },
  weekRow: {
    flexDirection: 'row',
  },
  dayCell: {
    flex: 1,
    height: 34,
    margin: 1,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCellPressable: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dayCellFull: {
    borderColor: colors.danger,
    borderWidth: 1.5,
  },
  dayCellMarked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dayCellPartial: {
    backgroundColor: colors.warningMuted,
    borderColor: colors.warning,
    borderWidth: 1.5,
  },
  dayText: {
    fontSize: 12,
    color: colors.text,
  },
  dayTextMarked: {
    color: '#fff',
    fontWeight: '700',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 14,
    height: 14,
    borderRadius: 7,
    paddingHorizontal: 2,
    backgroundColor: colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeFull: {
    backgroundColor: colors.danger,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#fff',
  },
  requestDot: {
    position: 'absolute',
    bottom: 3,
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.success,
  },
});
