/**
 * Un giorno di assenza per un dipendente: ferie (giorno intero, senza startTime/endTime) o
 * permesso (limitato a una fascia oraria, con startTime/endTime valorizzati). Un intervallo di
 * più giorni è più record, uno per data.
 */
export interface TimeOff {
  id: string;
  employeeId: string;
  /** Data in formato "YYYY-MM-DD". */
  date: string;
  note?: string;
  /** Se presenti insieme a endTime, l'assenza è un permesso limitato a questa fascia oraria. */
  startTime?: string;
  endTime?: string;
}
