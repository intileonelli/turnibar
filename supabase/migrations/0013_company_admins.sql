-- Il titolare che crea l'azienda ("fondatore") può promuovere un dipendente ad amministratore,
-- dandogli lo stesso accesso completo del titolare (stesso valore 'owner' su profiles.role, così
-- non serve toccare tutte le regole di sicurezza esistenti che già controllano quel valore).
-- Solo il fondatore può concedere/revocare questo status: si traccia chi è tramite una nuova
-- colonna su companies, popolata alla creazione e usata come controllo nella funzione dedicata.
alter table companies add column founder_profile_id uuid references profiles (id);

-- Backfill per le aziende già esistenti: il fondatore è l'unico titolare presente ad oggi
-- (la promozione ad amministratore non esisteva prima di questa migrazione).
update companies c
set founder_profile_id = (
  select p.id from profiles p where p.company_id = c.id and p.role = 'owner' order by p.id limit 1
)
where founder_profile_id is null;

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

  insert into companies (name, founder_profile_id) values (company_name, auth.uid()) returning id into new_company_id;

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

-- Promuove/revoca un dipendente ad amministratore (stesso accesso del titolare). Solo il
-- fondatore dell'azienda può usarla, e non può revocare se stesso.
create or replace function set_admin_status(p_profile_id uuid, p_is_admin boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_company_id uuid;
  founder_id uuid;
begin
  select company_id into target_company_id from profiles where id = p_profile_id;
  if target_company_id is null or target_company_id <> current_company_id() then
    raise exception 'Profilo non trovato in questa azienda.';
  end if;

  select founder_profile_id into founder_id from companies where id = target_company_id;
  if auth.uid() <> founder_id then
    raise exception 'Solo il titolare che ha creato l''azienda può gestire gli amministratori.';
  end if;

  if p_profile_id = founder_id then
    raise exception 'Il titolare non può rimuovere se stesso.';
  end if;

  update profiles set role = case when p_is_admin then 'owner' else 'employee' end where id = p_profile_id;
end;
$$;

grant execute on function set_admin_status(uuid, boolean) to authenticated;
