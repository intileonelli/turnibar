-- Fase 3: accesso per i dipendenti. Ogni dipendente inserito dal titolare può collegare il
-- proprio account a se stesso tramite un codice azienda condiviso dal titolare, scegliendo il
-- proprio nome da un elenco (processo di identificazione). Da quel momento l'account resta
-- collegato a quel dipendente: solo il titolare può cambiarlo in seguito.

alter table companies add column invite_code text unique not null
  default lower(substr(md5(random()::text || clock_timestamp()::text), 1, 8));

alter table employees add column user_id uuid references auth.users (id) unique;

create or replace function current_employee_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select id from employees where user_id = auth.uid()
$$;

-- Elenco dei dipendenti di un'azienda non ancora collegati a nessun account, dato il suo
-- codice: usata nella schermata "scegli chi sei" prima ancora di avere un profilo, quindi
-- bypassa le regole di sicurezza (il codice stesso fa da segreto condiviso).
create or replace function list_unclaimed_employees(p_invite_code text)
returns table (id uuid, name text)
language sql
security definer
stable
set search_path = public
as $$
  select e.id, e.name
  from employees e
  join companies c on c.id = e.company_id
  where c.invite_code = p_invite_code and e.user_id is null
  order by e.name;
$$;

-- Completa la registrazione di un dipendente: verifica il codice azienda, verifica che il
-- dipendente scelto esista, appartenga a quell'azienda e non sia già collegato a un altro
-- account, poi crea il profilo e collega l'account a quel dipendente.
create or replace function claim_employee_identity(
  p_invite_code text,
  p_employee_id uuid,
  p_full_name text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_company_id uuid;
begin
  if exists (select 1 from profiles where id = auth.uid()) then
    raise exception 'Esiste già un profilo per questo utente.';
  end if;

  select id into target_company_id from companies where invite_code = p_invite_code;
  if target_company_id is null then
    raise exception 'Codice azienda non valido.';
  end if;

  if not exists (
    select 1 from employees
    where id = p_employee_id and company_id = target_company_id and user_id is null
  ) then
    raise exception 'Dipendente non disponibile: potrebbe essere già collegato a un altro account.';
  end if;

  insert into profiles (id, company_id, role, full_name)
  values (auth.uid(), target_company_id, 'employee', p_full_name);

  update employees set user_id = auth.uid() where id = p_employee_id;
end;
$$;

-- Cambia a quale dipendente è collegato un account già registrato: solo il titolare può
-- usarla (es. per correggere un'identificazione sbagliata).
create or replace function reassign_employee_link(p_profile_id uuid, p_employee_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if current_user_role() <> 'owner' then
    raise exception 'Solo il titolare può modificare questo collegamento.';
  end if;

  if not exists (
    select 1 from profiles where id = p_profile_id and company_id = current_company_id() and role = 'employee'
  ) then
    raise exception 'Account dipendente non trovato in questa azienda.';
  end if;

  if not exists (select 1 from employees where id = p_employee_id and company_id = current_company_id()) then
    raise exception 'Dipendente non trovato in questa azienda.';
  end if;

  update employees set user_id = null where user_id = p_profile_id and company_id = current_company_id();
  update employees set user_id = p_profile_id where id = p_employee_id;
end;
$$;

grant execute on function list_unclaimed_employees(text) to authenticated;
grant execute on function claim_employee_identity(text, uuid, text) to authenticated;
grant execute on function reassign_employee_link(uuid, uuid) to authenticated;

-- Il titolare può correggere il nome/codice della propria azienda (es. rigenerare il codice
-- da condividere con i dipendenti).
create policy "owner_update_company" on companies for update
  using (id = current_company_id() and current_user_role() = 'owner')
  with check (id = current_company_id() and current_user_role() = 'owner');

-- Le due policy di auto-registrazione dell'azienda/profilo titolare non servono più: la
-- creazione ora passa sempre da create_company_and_owner_profile (che aggira le regole in modo
-- controllato), quindi si possono chiudere questi accessi diretti.
drop policy "insert_company_on_signup" on companies;
drop policy "insert_own_owner_profile" on profiles;

-- Da qui in giù: ogni tabella applicativa passa da un'unica regola "company_access" (chiunque
-- in azienda legge e scrive tutto) a due regole separate — lettura per tutti i membri
-- dell'azienda, scrittura riservata al titolare — così i dipendenti possono vedere turni,
-- ruoli, colleghi ecc. ma non modificarli. Le ferie sono un'eccezione voluta: ogni dipendente
-- gestisce le proprie.

drop policy "company_access" on roles;
create policy "owner_manage_roles" on roles for all
  using (company_id = current_company_id() and current_user_role() = 'owner')
  with check (company_id = current_company_id() and current_user_role() = 'owner');
create policy "select_company_roles" on roles for select
  using (company_id = current_company_id());

drop policy "company_access" on employees;
create policy "owner_manage_employees" on employees for all
  using (company_id = current_company_id() and current_user_role() = 'owner')
  with check (company_id = current_company_id() and current_user_role() = 'owner');
create policy "select_company_employees" on employees for select
  using (company_id = current_company_id());

drop policy "company_access" on opening_hours;
create policy "owner_manage_opening_hours" on opening_hours for all
  using (company_id = current_company_id() and current_user_role() = 'owner')
  with check (company_id = current_company_id() and current_user_role() = 'owner');
create policy "select_company_opening_hours" on opening_hours for select
  using (company_id = current_company_id());

drop policy "company_access" on shift_templates;
create policy "owner_manage_shift_templates" on shift_templates for all
  using (company_id = current_company_id() and current_user_role() = 'owner')
  with check (company_id = current_company_id() and current_user_role() = 'owner');
create policy "select_company_shift_templates" on shift_templates for select
  using (company_id = current_company_id());

drop policy "company_access" on shift_template_requirements;
create policy "owner_manage_requirements" on shift_template_requirements for all
  using (
    exists (
      select 1 from shift_templates t
      where t.id = shift_template_requirements.shift_template_id
        and t.company_id = current_company_id() and current_user_role() = 'owner'
    )
  )
  with check (
    exists (
      select 1 from shift_templates t
      where t.id = shift_template_requirements.shift_template_id
        and t.company_id = current_company_id() and current_user_role() = 'owner'
    )
  );
create policy "select_company_requirements" on shift_template_requirements for select
  using (
    exists (
      select 1 from shift_templates t
      where t.id = shift_template_requirements.shift_template_id and t.company_id = current_company_id()
    )
  );

drop policy "company_access" on schedules;
create policy "owner_manage_schedules" on schedules for all
  using (company_id = current_company_id() and current_user_role() = 'owner')
  with check (company_id = current_company_id() and current_user_role() = 'owner');
create policy "select_company_schedules" on schedules for select
  using (company_id = current_company_id());

drop policy "company_access" on shift_assignments;
create policy "owner_manage_assignments" on shift_assignments for all
  using (
    exists (
      select 1 from schedules s
      where s.id = shift_assignments.schedule_id
        and s.company_id = current_company_id() and current_user_role() = 'owner'
    )
  )
  with check (
    exists (
      select 1 from schedules s
      where s.id = shift_assignments.schedule_id
        and s.company_id = current_company_id() and current_user_role() = 'owner'
    )
  );
create policy "select_company_assignments" on shift_assignments for select
  using (
    exists (
      select 1 from schedules s
      where s.id = shift_assignments.schedule_id and s.company_id = current_company_id()
    )
  );

drop policy "company_access" on shop_settings;
create policy "owner_manage_shop_settings" on shop_settings for all
  using (company_id = current_company_id() and current_user_role() = 'owner')
  with check (company_id = current_company_id() and current_user_role() = 'owner');
create policy "select_company_shop_settings" on shop_settings for select
  using (company_id = current_company_id());

-- Le indisponibilità restano gestite solo dal titolare in questa fase (non ancora esposte ai
-- dipendenti nell'app).
drop policy "company_access" on unavailabilities;
create policy "owner_manage_unavailabilities" on unavailabilities for all
  using (
    exists (
      select 1 from employees e
      where e.id = unavailabilities.employee_id
        and e.company_id = current_company_id() and current_user_role() = 'owner'
    )
  )
  with check (
    exists (
      select 1 from employees e
      where e.id = unavailabilities.employee_id
        and e.company_id = current_company_id() and current_user_role() = 'owner'
    )
  );

-- Le ferie: il titolare gestisce quelle di chiunque, ogni dipendente gestisce le proprie,
-- tutti in azienda vedono il calendario completo (per sapere chi è già in ferie quel giorno).
drop policy "company_access" on time_off;
create policy "owner_manage_time_off" on time_off for all
  using (
    exists (
      select 1 from employees e
      where e.id = time_off.employee_id
        and e.company_id = current_company_id() and current_user_role() = 'owner'
    )
  )
  with check (
    exists (
      select 1 from employees e
      where e.id = time_off.employee_id
        and e.company_id = current_company_id() and current_user_role() = 'owner'
    )
  );
create policy "employee_manage_own_time_off" on time_off for all
  using (employee_id = current_employee_id())
  with check (employee_id = current_employee_id());
create policy "select_company_time_off" on time_off for select
  using (
    exists (
      select 1 from employees e where e.id = time_off.employee_id and e.company_id = current_company_id()
    )
  );
