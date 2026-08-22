/**
 * Aggiunge le impostazioni generali del negozio (per ora solo il numero massimo di dipendenti
 * che possono essere in ferie nello stesso giorno, configurabile perché varia da azienda ad
 * azienda). Riga singola con id fisso.
 */
export const MIGRATION_004_SHOP_SETTINGS = {
  version: 4,
  sql: `
    CREATE TABLE IF NOT EXISTS shop_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      max_daily_time_off INTEGER
    );

    INSERT OR IGNORE INTO shop_settings (id, max_daily_time_off) VALUES (1, NULL);
  `,
};
