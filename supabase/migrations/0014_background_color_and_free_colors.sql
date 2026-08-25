-- Terzo colore personalizzabile: il colore delle macchie decorative dello sfondo (finora
-- derivato automaticamente da principale/secondario). Inoltre, colore principale/secondario/
-- sfondo ora possono essere un qualsiasi colore scelto dalla ruota colori lato client, non solo
-- una delle 8 tinte curate: la colonna resta un semplice testo esadecimale, quindi qui non serve
-- alcuna modifica di vincoli, solo la nuova colonna.
alter table shop_settings add column background_color text;

drop function if exists get_shop_settings();
drop function if exists update_shop_settings(integer, boolean, text, text, text);

create function get_shop_settings()
returns table (
  max_daily_time_off integer,
  allow_multiple_shifts_per_day boolean,
  primary_color text,
  accent_color text,
  background_id text,
  background_color text
)
language sql
security invoker
stable
set search_path = public
as $$
  select max_daily_time_off, allow_multiple_shifts_per_day, primary_color, accent_color, background_id, background_color
  from shop_settings
  where company_id = current_company_id();
$$;

create function update_shop_settings(
  p_max_daily_time_off integer,
  p_allow_multiple_shifts_per_day boolean,
  p_primary_color text,
  p_accent_color text,
  p_background_id text,
  p_background_color text
)
returns void
language sql
security invoker
set search_path = public
as $$
  insert into shop_settings (
    company_id, max_daily_time_off, allow_multiple_shifts_per_day,
    primary_color, accent_color, background_id, background_color
  )
  values (
    current_company_id(), p_max_daily_time_off, coalesce(p_allow_multiple_shifts_per_day, false),
    p_primary_color, p_accent_color, p_background_id, p_background_color
  )
  on conflict (company_id) do update
    set max_daily_time_off = excluded.max_daily_time_off,
        allow_multiple_shifts_per_day = excluded.allow_multiple_shifts_per_day,
        primary_color = excluded.primary_color,
        accent_color = excluded.accent_color,
        background_id = excluded.background_id,
        background_color = excluded.background_color;
$$;

grant execute on function get_shop_settings() to authenticated;
grant execute on function update_shop_settings(integer, boolean, text, text, text, text) to authenticated;
