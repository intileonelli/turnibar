/**
 * Richiesta di un dipendente di lavorare, in una data specifica, solo in una determinata fascia
 * oraria (es. "quel giorno devo fare la sera"). Come i turni fissi, ma per un singolo giorno
 * invece che per un giorno della settimana ricorrente: se il dipendente viene assegnato quella
 * data, può esserlo solo a un turno di questa fascia.
 */
export interface CategoryRequest {
  id: string;
  employeeId: string;
  /** Data in formato "YYYY-MM-DD". */
  date: string;
  categoryId: string;
  note?: string;
}
