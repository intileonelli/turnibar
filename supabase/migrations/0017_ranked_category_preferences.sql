-- La preferenza di fascia oraria diventa una lista ordinata (prima scelta più importante della
-- seconda, e così via) invece di una sola fascia: chi ha più fasce che gli vanno bene può
-- indicarle tutte, con un ordine di importanza, invece di sceglierne per forza una sola.
alter table employees add column preferred_category_ids uuid[];

update employees
set preferred_category_ids = array[preferred_category_id]
where preferred_category_id is not null;

alter table employees drop column preferred_category_id;
