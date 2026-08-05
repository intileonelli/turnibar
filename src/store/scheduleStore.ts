import { create } from 'zustand';
import { addDays, getMondayOfWeek } from '@/src/utils/date';

interface ScheduleStoreState {
  /** Lunedì della settimana attualmente visualizzata/modificata, formato "YYYY-MM-DD". */
  weekStartDate: string;
  setWeekStartDate: (date: string) => void;
  goToNextWeek: () => void;
  goToPreviousWeek: () => void;
  goToCurrentWeek: () => void;
}

export const useScheduleStore = create<ScheduleStoreState>((set, get) => ({
  weekStartDate: getMondayOfWeek(new Date()),
  setWeekStartDate: (date) => set({ weekStartDate: date }),
  goToNextWeek: () => set({ weekStartDate: addDays(get().weekStartDate, 7) }),
  goToPreviousWeek: () => set({ weekStartDate: addDays(get().weekStartDate, -7) }),
  goToCurrentWeek: () => set({ weekStartDate: getMondayOfWeek(new Date()) }),
}));
