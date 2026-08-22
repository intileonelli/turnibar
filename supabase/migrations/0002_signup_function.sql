-- Funzione unica per completare la registrazione: crea l'azienda e il profilo
-- del titolare in un solo passaggio sicuro, evitando il problema per cui un
-- utente senza ancora un profilo non può "rileggere" l'azienda appena creata
-- (le regole di sicurezza per la lettura si basano proprio sul profilo).

create or replace function create_company_and_owner_profile(company_name text, owner_full_name text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  new_company_id uuid;
begin
  if exists (select 1 from profiles where id = auth.uid()) then
    raise exception 'Esiste già un profilo per questo utente.';
  end if;

  insert into companies (name) values (company_name) returning id into new_company_id;

  insert into profiles (id, company_id, role, full_name)
  values (auth.uid(), new_company_id, 'owner', owner_full_name);
end;
$$;

grant execute on function create_company_and_owner_profile(text, text) to authenticated;
