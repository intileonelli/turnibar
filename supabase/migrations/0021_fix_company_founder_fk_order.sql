-- Bug: create_company_and_owner_profile inseriva founder_profile_id (che referenzia profiles)
-- PRIMA di creare la riga in profiles per quello stesso utente, violando sempre la foreign key
-- "companies_founder_profile_id_fkey" introdotta dalla migrazione 0013 — impedendo la creazione
-- di qualunque nuova azienda. Si crea prima l'azienda senza founder, poi il profilo, poi si
-- aggiorna l'azienda con il founder appena creato.
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

  update companies set founder_profile_id = auth.uid() where id = new_company_id;

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
