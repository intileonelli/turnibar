-- Fase 2: tabelle applicative (ruoli, dipendenti, turni tipo, pianificazioni, ferie,
-- indisponibilità, impostazioni negozio), ciascuna collegata all'azienda di chi la crea
-- tramite un valore di default automatico (current_company_id()), e protetta da regole
-- di sicurezza che permettono l'accesso solo a chi appartiene alla stessa azienda.

create table roles (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default current_company_id() references companies (id) on delete cascade,
  name text not null,
  color text not null
);

create table employees (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default current_company_id() references companies (id) on delete cascade,
  name text not null,
  role_id uuid not null references roles (id),
  secondary_role_id uuid references roles (id),
  weekly_contract_hours numeric,
  max_weekly_hours numeric,
  max_weekly_shifts integer,
  max_weekly_days integer,
  preferred_weekdays integer[],
  preference text not null default 'nessuna',
  pinned_shift_template_ids uuid[],
  max_weekly_shifts_by_preference jsonb,
  active boolean not null default true
);

create table unavailabilities (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees (id) on delete cascade,
  weekday integer not null,
  start_time text not null,
  end_time text not null,
  note text
);
create index idx_unavailabilities_employee on unavailabilities (employee_id);

create table time_off (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees (id) on delete cascade,
  date text not null,
  note text,
  unique (employee_id, date)
);
create index idx_time_off_employee on time_off (employee_id);

create table opening_hours (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default current_company_id() references companies (id) on delete cascade,
  weekday integer not null,
  closed boolean not null default false,
  open_time text not null default '09:00',
  close_time text not null default '20:00',
  unique (company_id, weekday)
);

create table shift_templates (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default current_company_id() references companies (id) on delete cascade,
  weekday integer not null,
  name text not null,
  start_time text not null,
  end_time text not null
);
create index idx_shift_templates_weekday on shift_templates (weekday);

create table shift_template_requirements (
  id uuid primary key default gen_random_uuid(),
  shift_template_id uuid not null references shift_templates (id) on delete cascade,
  role_ids uuid[] not null,
  count integer not null
);
create index idx_requirements_template on shift_template_requirements (shift_template_id);

create table schedules (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default current_company_id() references companies (id) on delete cascade,
  week_start_date text not null,
  generated_at timestamptz not null default now(),
  status text not null,
  unique (company_id, week_start_date)
);

create table shift_assignments (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references schedules (id) on delete cascade,
  shift_template_id uuid not null references shift_templates (id),
  date text not null,
  employee_id uuid not null references employees (id),
  role_ids uuid[],
  manually_edited boolean not null default false
);
create index idx_assignments_schedule on shift_assignments (schedule_id);
create index idx_assignments_date on shift_assignments (date);

-- Una sola riga per azienda: la chiave primaria è l'azienda stessa.
create table shop_settings (
  company_id uuid primary key references companies (id) on delete cascade,
  max_daily_time_off integer
);

alter table roles enable row level security;
alter table employees enable row level security;
alter table unavailabilities enable row level security;
alter table time_off enable row level security;
alter table opening_hours enable row level security;
alter table shift_templates enable row level security;
alter table shift_template_requirements enable row level security;
alter table schedules enable row level security;
alter table shift_assignments enable row level security;
alter table shop_settings enable row level security;

create policy "company_access" on roles for all
  using (company_id = current_company_id())
  with check (company_id = current_company_id());

create policy "company_access" on employees for all
  using (company_id = current_company_id())
  with check (company_id = current_company_id());

create policy "company_access" on opening_hours for all
  using (company_id = current_company_id())
  with check (company_id = current_company_id());

create policy "company_access" on shift_templates for all
  using (company_id = current_company_id())
  with check (company_id = current_company_id());

create policy "company_access" on schedules for all
  using (company_id = current_company_id())
  with check (company_id = current_company_id());

create policy "company_access" on shop_settings for all
  using (company_id = current_company_id())
  with check (company_id = current_company_id());

create policy "company_access" on unavailabilities for all
  using (exists (
    select 1 from employees e where e.id = unavailabilities.employee_id and e.company_id = current_company_id()
  ))
  with check (exists (
    select 1 from employees e where e.id = unavailabilities.employee_id and e.company_id = current_company_id()
  ));

create policy "company_access" on time_off for all
  using (exists (
    select 1 from employees e where e.id = time_off.employee_id and e.company_id = current_company_id()
  ))
  with check (exists (
    select 1 from employees e where e.id = time_off.employee_id and e.company_id = current_company_id()
  ));

create policy "company_access" on shift_template_requirements for all
  using (exists (
    select 1 from shift_templates t
    where t.id = shift_template_requirements.shift_template_id and t.company_id = current_company_id()
  ))
  with check (exists (
    select 1 from shift_templates t
    where t.id = shift_template_requirements.shift_template_id and t.company_id = current_company_id()
  ));

create policy "company_access" on shift_assignments for all
  using (exists (
    select 1 from schedules s where s.id = shift_assignments.schedule_id and s.company_id = current_company_id()
  ))
  with check (exists (
    select 1 from schedules s where s.id = shift_assignments.schedule_id and s.company_id = current_company_id()
  ));

grant select, insert, update, delete on
  roles, employees, unavailabilities, time_off, opening_hours,
  shift_templates, shift_template_requirements, schedules, shift_assignments, shop_settings
  to authenticated;

-- Genera la pianificazione di una settimana in un'unica operazione atomica: cancella
-- l'eventuale pianificazione precedente della stessa settimana e inserisce quella nuova
-- con tutte le assegnazioni, tutto o niente.
create or replace function save_generated_schedule(
  p_week_start_date text,
  p_status text,
  p_assignments jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  new_schedule_id uuid;
  a jsonb;
begin
  delete from schedules where company_id = current_company_id() and week_start_date = p_week_start_date;

  insert into schedules (company_id, week_start_date, status)
  values (current_company_id(), p_week_start_date, p_status)
  returning id into new_schedule_id;

  for a in select * from jsonb_array_elements(p_assignments)
  loop
    insert into shift_assignments (schedule_id, shift_template_id, date, employee_id, role_ids, manually_edited)
    values (
      new_schedule_id,
      (a ->> 'shiftTemplateId')::uuid,
      a ->> 'date',
      (a ->> 'employeeId')::uuid,
      case when jsonb_typeof(a -> 'roleIds') = 'array'
        then array(select jsonb_array_elements_text(a -> 'roleIds'))::uuid[]
        else null end,
      false
    );
  end loop;

  return new_schedule_id;
end;
$$;

grant execute on function save_generated_schedule(text, text, jsonb) to authenticated;

-- Impostazioni negozio: lette/scritte tramite funzioni dedicate, così il client non deve
-- conoscere l'id dell'azienda per accedere alla sua unica riga di impostazioni.
create or replace function get_shop_settings()
returns table (max_daily_time_off integer)
language sql
security invoker
stable
set search_path = public
as $$
  select max_daily_time_off from shop_settings where company_id = current_company_id();
$$;

create or replace function update_shop_settings(p_max_daily_time_off integer)
returns void
language sql
security invoker
set search_path = public
as $$
  update shop_settings set max_daily_time_off = p_max_daily_time_off where company_id = current_company_id();
$$;

grant execute on function get_shop_settings() to authenticated;
grant execute on function update_shop_settings(integer) to authenticated;

-- Aggiorna la registrazione: ora crea anche le impostazioni di default del negozio e gli
-- orari di apertura per i 7 giorni della settimana (domenica chiusa di default), cosa che
-- prima faceva l'app al primo avvio sul database locale.
create or replace function create_company_and_owner_profile(company_name text, owner_full_name text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  new_company_id uuid;
  wd integer;
begin
  if exists (select 1 from profiles where id = auth.uid()) then
    raise exception 'Esiste già un profilo per questo utente.';
  end if;

  insert into companies (name) values (company_name) returning id into new_company_id;

  insert into profiles (id, company_id, role, full_name)
  values (auth.uid(), new_company_id, 'owner', owner_full_name);

  insert into shop_settings (company_id, max_daily_time_off)
  values (new_company_id, null);

  for wd in 1..7 loop
    insert into opening_hours (company_id, weekday, closed, open_time, close_time)
    values (new_company_id, wd, wd = 7, '09:00', '20:00');
  end loop;
end;
$$;

grant execute on function create_company_and_owner_profile(text, text) to authenticated;
