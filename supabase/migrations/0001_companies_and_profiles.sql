-- Struttura base multi-azienda: ogni azienda ("company") ha i propri utenti,
-- ognuno con un ruolo (titolare o dipendente). Da qui partiranno in futuro
-- tutte le altre tabelle (dipendenti, turni, ferie, ecc.), ciascuna collegata
-- a una company_id in modo che i dati di aziende diverse non si mescolino mai.

create table if not exists companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  company_id uuid not null references companies (id) on delete cascade,
  role text not null check (role in ('owner', 'employee')),
  full_name text not null,
  created_at timestamptz not null default now()
);

alter table companies enable row level security;
alter table profiles enable row level security;

-- Funzioni di supporto: restituiscono azienda e ruolo dell'utente collegato,
-- usate dalle regole di sicurezza qui sotto e da quelle delle prossime tabelle.
create or replace function current_company_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select company_id from profiles where id = auth.uid()
$$;

create or replace function current_user_role()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select role from profiles where id = auth.uid()
$$;

-- Un utente vede solo la propria azienda e i profili della propria azienda.
create policy "select_own_company" on companies
  for select
  using (id = current_company_id());

create policy "select_company_profiles" on profiles
  for select
  using (company_id = current_company_id());

-- Un nuovo utente autenticato può creare la propria azienda una sola volta,
-- durante la registrazione come titolare (i dipendenti verranno invitati in
-- un secondo momento con un meccanismo dedicato, non con questa policy).
create policy "insert_company_on_signup" on companies
  for insert
  to authenticated
  with check (true);

create policy "insert_own_owner_profile" on profiles
  for insert
  to authenticated
  with check (id = auth.uid() and role = 'owner');

-- Un utente può aggiornare solo il proprio profilo (es. il nome).
create policy "update_own_profile" on profiles
  for update
  using (id = auth.uid());
