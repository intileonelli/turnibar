-- L'ordine dei turni in una giornata era deciso dall'orario di inizio/fine effettivo: due giorni
-- con lo stesso "tipo" di turni ma orari leggermente diversi (es. giovedì e venerdì) potevano
-- mostrarli in un ordine diverso l'uno dall'altro, confondendo chi legge. L'ordine diventa un
-- valore esplicito, indipendente dall'orario: uguale ogni giorno finché non lo si cambia a mano.
alter table shift_templates add column sort_order integer not null default 0;

-- Backfill: assegna l'ordine attuale (per orario, come si vedeva finora) come punto di partenza,
-- così il cambiamento non stravolge subito nulla per chi già usa l'app.
with ordered as (
  select id, row_number() over (
    partition by company_id, weekday
    order by start_time, end_time
  ) - 1 as rn
  from shift_templates
)
update shift_templates
set sort_order = ordered.rn
from ordered
where shift_templates.id = ordered.id;
