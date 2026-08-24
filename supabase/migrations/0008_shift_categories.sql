-- Le fasce orarie (prima "mattina/pomeriggio/sera" fisse, indovinate dall'orario di inizio)
-- diventano una lista personalizzabile per azienda, come già i Ruoli: ogni azienda definisce le
-- proprie fasce (nome libero, quante ne vuole), ogni turno tipo viene assegnato esplicitamente a
-- una di esse, e le preferenze/i limiti dei dipendenti fanno riferimento a queste invece che a
-- soglie orarie fisse che non si adattano a tutte le attività.

create table shift_categories (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default current_company_id() references companies (id) on delete cascade,
  name text not null,
  sort_order integer not null default 0
);

alter table shift_categories enable row level security;

create policy "owner_manage_shift_categories" on shift_categories for all
  using (company_id = current_company_id() and current_user_role() = 'owner')
  with check (company_id = current_company_id() and current_user_role() = 'owner');
create policy "select_company_shift_categories" on shift_categories for select
  using (company_id = current_company_id());

grant select, insert, update, delete on shift_categories to authenticated;

-- Turni tipo: ogni turno appartiene esplicitamente a una fascia.
alter table shift_templates add column category_id uuid references shift_categories (id);

-- Dipendenti: la preferenza e i limiti per fascia ora fanno riferimento alle fasce dell'azienda
-- invece che a 'mattina'/'pomeriggio'/'sera' fissi.
alter table employees add column preferred_category_id uuid references shift_categories (id);

-- Backfill per le aziende già esistenti: per ciascuna, crea le 3 fasce di partenza
-- (Mattina/Pomeriggio/Sera, gli stessi nomi usati finora), assegna ogni turno tipo già creato
-- alla fascia più plausibile in base al suo orario di inizio (con la stessa soglia usata finora:
-- prima delle 13 mattina, prima delle 17 pomeriggio, altrimenti sera — un punto di partenza da
-- correggere con calma dove serve), e traduce la preferenza e i limiti già impostati sui
-- dipendenti nelle nuove fasce.
do $$
declare
  c record;
  morning_id uuid;
  afternoon_id uuid;
  evening_id uuid;
  emp record;
  old_limits jsonb;
  new_limits jsonb;
begin
  for c in select id from companies loop
    insert into shift_categories (company_id, name, sort_order) values (c.id, 'Mattina', 1) returning id into morning_id;
    insert into shift_categories (company_id, name, sort_order) values (c.id, 'Pomeriggio', 2) returning id into afternoon_id;
    insert into shift_categories (company_id, name, sort_order) values (c.id, 'Sera', 3) returning id into evening_id;

    update shift_templates
    set category_id = case
      when to_timestamp(start_time, 'HH24:MI')::time < time '13:00' then morning_id
      when to_timestamp(start_time, 'HH24:MI')::time < time '17:00' then afternoon_id
      else evening_id
    end
    where company_id = c.id;

    for emp in select id, preference, max_weekly_shifts_by_preference from employees where company_id = c.id loop
      update employees
      set preferred_category_id = case emp.preference
        when 'mattina' then morning_id
        when 'pomeriggio' then afternoon_id
        when 'sera' then evening_id
        else null
      end
      where id = emp.id;

      old_limits := emp.max_weekly_shifts_by_preference;
      if old_limits is not null then
        new_limits := '{}'::jsonb;
        if old_limits ? 'mattina' then
          new_limits := new_limits || jsonb_build_object(morning_id::text, old_limits -> 'mattina');
        end if;
        if old_limits ? 'pomeriggio' then
          new_limits := new_limits || jsonb_build_object(afternoon_id::text, old_limits -> 'pomeriggio');
        end if;
        if old_limits ? 'sera' then
          new_limits := new_limits || jsonb_build_object(evening_id::text, old_limits -> 'sera');
        end if;
        update employees set max_weekly_shifts_by_preference = new_limits where id = emp.id;
      end if;
    end loop;
  end loop;
end $$;

-- Ora che ogni turno tipo esistente ha una fascia, il campo diventa obbligatorio per i nuovi.
alter table shift_templates alter column category_id set not null;

-- Le vecchie colonne testuali non servono più.
alter table employees drop column preference;

-- Aggiorna la registrazione: crea anche le 3 fasce di partenza per ogni nuova azienda.
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

  insert into shift_categories (company_id, name, sort_order) values
    (new_company_id, 'Mattina', 1),
    (new_company_id, 'Pomeriggio', 2),
    (new_company_id, 'Sera', 3);
end;
$$;

grant execute on function create_company_and_owner_profile(text, text) to authenticated;
