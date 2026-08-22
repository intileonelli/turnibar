-- Priorità del dipendente nella generazione automatica dei turni: "alta" viene preferito,
-- "bassa" viene usato solo quando serve davvero (nessun candidato migliore disponibile per
-- quello slot), "normale" (o non impostato) non cambia nulla rispetto a oggi.
alter table employees add column priority text check (priority in ('alta', 'normale', 'bassa'));
