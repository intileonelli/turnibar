-- Eliminare un dipendente falliva silenziosamente (errore di vincolo non gestito lato client)
-- non appena aveva anche un solo turno già assegnato: shift_assignments.employee_id non aveva
-- "on delete cascade" come le altre tabelle collegate al dipendente (indisponibilità, ferie,
-- fasce richieste). Eliminando un dipendente è corretto eliminare anche i turni passati a lui
-- assegnati, che altrimenti resterebbero orfani.
alter table shift_assignments drop constraint shift_assignments_employee_id_fkey;
alter table shift_assignments
  add constraint shift_assignments_employee_id_fkey
  foreign key (employee_id) references employees (id) on delete cascade;
