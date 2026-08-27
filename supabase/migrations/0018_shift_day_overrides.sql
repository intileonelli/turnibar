-- Modifiche a un turno valide solo per un giorno specifico (orario diverso o turno nascosto per
-- quel giorno), senza toccare il turno tipo ricorrente: alla prossima generazione turni per la
-- settimana, queste eccezioni vengono cancellate e la giornata torna a quella standard.
create table shift_day_overrides (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default current_company_id() references companies (id) on delete cascade,
  shift_template_id uuid not null references shift_templates (id) on delete cascade,
  date text not null,
  start_time text,
  end_time text,
  hidden boolean not null default false,
  unique (shift_template_id, date)
);
create index idx_shift_day_overrides_date on shift_day_overrides (date);

alter table shift_day_overrides enable row level security;

create policy "owner_manage_shift_day_overrides" on shift_day_overrides for all
  using (company_id = current_company_id() and current_user_role() = 'owner')
  with check (company_id = current_company_id() and current_user_role() = 'owner');
create policy "select_company_shift_day_overrides" on shift_day_overrides for select
  using (company_id = current_company_id());

grant select, insert, update, delete on shift_day_overrides to authenticated;
