-- Intensità delle ombre (Card, pulsanti, cerchi della Home, ecc.): regolabile dal titolare per
-- adattarla a sfondi personalizzati molto chiari o molto scuri. 100 = intensità di default
-- dell'app, 0 = nessuna ombra, valori oltre 100 la rafforzano.
alter table shop_settings add column shadow_intensity integer;

drop function if exists get_shop_settings();
drop function if exists update_shop_settings(integer, boolean, text, text, text, integer);

create function get_shop_settings()
returns table (
  max_daily_time_off integer,
  allow_multiple_shifts_per_day boolean,
  primary_color text,
  accent_color text,
  background_color text,
  background_opacity integer,
  shadow_intensity integer
)
language sql
security invoker
stable
set search_path = public
as $$
  select max_daily_time_off, allow_multiple_shifts_per_day, primary_color, accent_color, background_color, background_opacity, shadow_intensity
  from shop_settings
  where company_id = current_company_id();
$$;

create function update_shop_settings(
  p_max_daily_time_off integer,
  p_allow_multiple_shifts_per_day boolean,
  p_primary_color text,
  p_accent_color text,
  p_background_color text,
  p_background_opacity integer,
  p_shadow_intensity integer
)
returns void
language sql
security invoker
set search_path = public
as $$
  insert into shop_settings (
    company_id, max_daily_time_off, allow_multiple_shifts_per_day,
    primary_color, accent_color, background_color, background_opacity, shadow_intensity
  )
  values (
    current_company_id(), p_max_daily_time_off, coalesce(p_allow_multiple_shifts_per_day, false),
    p_primary_color, p_accent_color, p_background_color, p_background_opacity, p_shadow_intensity
  )
  on conflict (company_id) do update
    set max_daily_time_off = excluded.max_daily_time_off,
        allow_multiple_shifts_per_day = excluded.allow_multiple_shifts_per_day,
        primary_color = excluded.primary_color,
        accent_color = excluded.accent_color,
        background_color = excluded.background_color,
        background_opacity = excluded.background_opacity,
        shadow_intensity = excluded.shadow_intensity;
$$;

grant execute on function get_shop_settings() to authenticated;
grant execute on function update_shop_settings(integer, boolean, text, text, text, integer, integer) to authenticated;
