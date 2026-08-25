-- Lo sfondo decorativo diventa un velo di colore sull'intera schermata (non più macchie in un
-- angolo), con una trasparenza regolabile dal titolare: sostituisce la scelta di "posizione".
alter table shop_settings drop column background_id;
alter table shop_settings add column background_opacity integer;

drop function if exists get_shop_settings();
drop function if exists update_shop_settings(integer, boolean, text, text, text, text);

create function get_shop_settings()
returns table (
  max_daily_time_off integer,
  allow_multiple_shifts_per_day boolean,
  primary_color text,
  accent_color text,
  background_color text,
  background_opacity integer
)
language sql
security invoker
stable
set search_path = public
as $$
  select max_daily_time_off, allow_multiple_shifts_per_day, primary_color, accent_color, background_color, background_opacity
  from shop_settings
  where company_id = current_company_id();
$$;

create function update_shop_settings(
  p_max_daily_time_off integer,
  p_allow_multiple_shifts_per_day boolean,
  p_primary_color text,
  p_accent_color text,
  p_background_color text,
  p_background_opacity integer
)
returns void
language sql
security invoker
set search_path = public
as $$
  insert into shop_settings (
    company_id, max_daily_time_off, allow_multiple_shifts_per_day,
    primary_color, accent_color, background_color, background_opacity
  )
  values (
    current_company_id(), p_max_daily_time_off, coalesce(p_allow_multiple_shifts_per_day, false),
    p_primary_color, p_accent_color, p_background_color, p_background_opacity
  )
  on conflict (company_id) do update
    set max_daily_time_off = excluded.max_daily_time_off,
        allow_multiple_shifts_per_day = excluded.allow_multiple_shifts_per_day,
        primary_color = excluded.primary_color,
        accent_color = excluded.accent_color,
        background_color = excluded.background_color,
        background_opacity = excluded.background_opacity;
$$;

grant execute on function get_shop_settings() to authenticated;
grant execute on function update_shop_settings(integer, boolean, text, text, text, integer) to authenticated;

-- Impostazioni di lettura personali (non dell'azienda): dimensione e colore del testo, per chi
-- ha bisogno di caratteri più grandi o di un contrasto diverso. Modificabili da ciascun utente
-- per il proprio account (dipendenti inclusi): la policy "update_own_profile" già esistente
-- copre queste nuove colonne, non serve una nuova regola.
alter table profiles add column font_scale numeric not null default 1;
alter table profiles add column font_color text;
