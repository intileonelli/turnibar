/**
 * Aggiunge alle assegnazioni turno il riferimento ai ruoli del requisito specifico che
 * riempiono. Prima, la UI doveva "indovinare" a quale requisito appartenesse un'assegnazione
 * confrontando il ruolo (principale o secondario) del dipendente con i ruoli di ogni requisito
 * del turno tipo: se un turno aveva più requisiti con ruoli che si sovrapponevano (es. tramite
 * il ruolo secondario di un dipendente), la stessa assegnazione veniva mostrata sotto più
 * requisiti, facendo sembrare che servissero più persone per un singolo posto.
 */
export const MIGRATION_005_ASSIGNMENT_ROLES = {
  version: 5,
  sql: `
    ALTER TABLE shift_assignments ADD COLUMN role_ids TEXT;
  `,
};
