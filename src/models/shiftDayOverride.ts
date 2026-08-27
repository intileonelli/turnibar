/**
 * Modifica a un turno tipo valida solo per una data specifica (orario diverso e/o turno
 * nascosto quel giorno): non tocca il turno tipo ricorrente, e viene cancellata alla prossima
 * generazione turni per quella settimana (torna la giornata standard).
 */
export interface ShiftDayOverride {
  id: string;
  shiftTemplateId: string;
  /** Data in formato "YYYY-MM-DD". */
  date: string;
  /** Orario sostitutivo per questa data, se impostato ("HH:mm"). Non impostato = orario standard del turno tipo. */
  startTime?: string;
  endTime?: string;
  /** Se true, il turno non compare affatto in questa data (né in visualizzazione né per l'assegnazione). */
  hidden: boolean;
}
