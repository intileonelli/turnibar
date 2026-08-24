-- Nuova impostazione a livello di azienda: se un dipendente può essere assegnato a più di un
-- turno nello stesso giorno (finché gli orari non si sovrappongono). Di default "no", perché è
-- il comportamento che la maggior parte delle attività si aspetta; le aziende che invece
-- lavorano con turni spezzati possono attivarla dalle impostazioni del negozio.
alter table shop_settings add column allow_multiple_shifts_per_day boolean not null default false;

-- Le due funzioni cambiano "forma" (nuovo campo in lettura, nuovo parametro in scrittura):
-- vanno eliminate ed ricreate, "create or replace" non permette di cambiare la forma dei dati
-- restituiti da una funzione esistente.
drop function if exists get_shop_settings();
drop function if exists update_shop_settings(integer);

create function get_shop_settings()
returns table (max_daily_time_off integer, allow_multiple_shifts_per_day boolean)
language sql
security invoker
stable
set search_path = public
as $$
  select max_daily_time_off, allow_multiple_shifts_per_day
  from shop_settings
  where company_id = current_company_id();
$$;

create function update_shop_settings(
  p_max_daily_time_off integer,
  p_allow_multiple_shifts_per_day boolean
)
returns void
language sql
security invoker
set search_path = public
as $$
  insert into shop_settings (company_id, max_daily_time_off, allow_multiple_shifts_per_day)
  values (current_company_id(), p_max_daily_time_off, coalesce(p_allow_multiple_shifts_per_day, false))
  on conflict (company_id) do update
    set max_daily_time_off = excluded.max_daily_time_off,
        allow_multiple_shifts_per_day = excluded.allow_multiple_shifts_per_day;
$$;

grant execute on function get_shop_settings() to authenticated;
grant execute on function update_shop_settings(integer, boolean) to authenticated;
