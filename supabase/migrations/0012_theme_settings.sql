-- Personalizzazione dell'aspetto per azienda: due colori (principale e secondario, scelti da
-- una palette curata per restare sempre leggibili) e uno sfondo decorativo predefinito
-- (sfumature soffuse in un angolo, mai foto/upload). null = usa i valori di default dell'app.
alter table shop_settings add column primary_color text;
alter table shop_settings add column accent_color text;
alter table shop_settings add column background_id text;

drop function if exists get_shop_settings();
drop function if exists update_shop_settings(integer, boolean);

create function get_shop_settings()
returns table (
  max_daily_time_off integer,
  allow_multiple_shifts_per_day boolean,
  primary_color text,
  accent_color text,
  background_id text
)
language sql
security invoker
stable
set search_path = public
as $$
  select max_daily_time_off, allow_multiple_shifts_per_day, primary_color, accent_color, background_id
  from shop_settings
  where company_id = current_company_id();
$$;

create function update_shop_settings(
  p_max_daily_time_off integer,
  p_allow_multiple_shifts_per_day boolean,
  p_primary_color text,
  p_accent_color text,
  p_background_id text
)
returns void
language sql
security invoker
set search_path = public
as $$
  insert into shop_settings (
    company_id, max_daily_time_off, allow_multiple_shifts_per_day,
    primary_color, accent_color, background_id
  )
  values (
    current_company_id(), p_max_daily_time_off, coalesce(p_allow_multiple_shifts_per_day, false),
    p_primary_color, p_accent_color, p_background_id
  )
  on conflict (company_id) do update
    set max_daily_time_off = excluded.max_daily_time_off,
        allow_multiple_shifts_per_day = excluded.allow_multiple_shifts_per_day,
        primary_color = excluded.primary_color,
        accent_color = excluded.accent_color,
        background_id = excluded.background_id;
$$;

grant execute on function get_shop_settings() to authenticated;
grant execute on function update_shop_settings(integer, boolean, text, text, text) to authenticated;
