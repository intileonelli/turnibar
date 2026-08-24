/**
 * Fascia oraria personalizzata dell'azienda (es. "Apertura", "Mattina", "Pomeriggio", "Sera"):
 * ogni turno tipo appartiene a una di queste, scelta esplicitamente dal titolare invece di
 * essere indovinata dall'orario di inizio — così ogni azienda può definire le proprie fasce.
 */
export interface ShiftCategory {
  id: string;
  name: string;
  sortOrder: number;
}
