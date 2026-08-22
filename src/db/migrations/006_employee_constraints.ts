/**
 * Aggiunge due vincoli personalizzabili per dipendente:
 * - turni tipo "fissi" a cui va assegnato con priorità assoluta quando idoneo;
 * - limite massimo di turni per fascia oraria (mattina/pomeriggio/sera) a settimana,
 *   indipendente per ciascuna fascia.
 * Semplice ADD COLUMN: a differenza della migrazione che ha reso opzionali le ore, qui non si
 * rinomina la tabella employees, quindi non c'è rischio di lasciare le altre tabelle (ferie,
 * indisponibilità, turni assegnati) con un riferimento pendente.
 */
export const MIGRATION_006_EMPLOYEE_CONSTRAINTS = {
  version: 6,
  sql: `
    ALTER TABLE employees ADD COLUMN pinned_shift_template_ids TEXT;
    ALTER TABLE employees ADD COLUMN max_weekly_shifts_by_preference TEXT;
  `,
};
