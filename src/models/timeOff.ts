/** Un giorno di ferie/permesso per un dipendente. Un intervallo di più giorni è più record, uno per data. */
export interface TimeOff {
  id: string;
  employeeId: string;
  /** Data in formato "YYYY-MM-DD". */
  date: string;
  note?: string;
}
