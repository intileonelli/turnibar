-- Due nuove possibilità per i dipendenti, oltre alle ferie (giorno intero):
-- 1. "Permesso": un'assenza per una fascia oraria specifica di un giorno (non l'intera giornata),
--    vincolo assoluto come le ferie, ma limitato all'orario indicato.
-- 2. "Fascia richiesta": per un giorno specifico, il dipendente chiede di lavorare solo in una
--    data fascia oraria (es. "quel giorno devo fare la sera") — stesso meccanismo dei turni
--    fissi, ma per una singola data invece che per un giorno della settimana ricorrente.

-- Le ferie diventano "assenza": se start_time/end_time sono valorizzati è un permesso limitato
-- a quella fascia, altrimenti resta un'assenza per l'intera giornata come finora.
alter table time_off add column start_time text;
alter table time_off add column end_time text;

create table category_requests (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees (id) on delete cascade,
  date text not null,
  category_id uuid not null references shift_categories (id) on delete cascade,
  note text,
  unique (employee_id, date)
);
create index idx_category_requests_employee on category_requests (employee_id);

alter table category_requests enable row level security;

-- Stesso schema di permessi delle ferie: il titolare gestisce quelle di chiunque, ogni
-- dipendente gestisce le proprie, tutti in azienda le vedono (per generare/validare i turni).
create policy "owner_manage_category_requests" on category_requests for all
  using (
    exists (
      select 1 from employees e
      where e.id = category_requests.employee_id
        and e.company_id = current_company_id() and current_user_role() = 'owner'
    )
  )
  with check (
    exists (
      select 1 from employees e
      where e.id = category_requests.employee_id
        and e.company_id = current_company_id() and current_user_role() = 'owner'
    )
  );
create policy "employee_manage_own_category_requests" on category_requests for all
  using (employee_id = current_employee_id())
  with check (employee_id = current_employee_id());
create policy "select_company_category_requests" on category_requests for select
  using (
    exists (
      select 1 from employees e where e.id = category_requests.employee_id and e.company_id = current_company_id()
    )
  );

grant select, insert, update, delete on category_requests to authenticated;
