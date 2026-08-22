-- Le aziende create prima che la registrazione creasse automaticamente shop_settings e
-- opening_hours si ritrovano senza queste righe: qualsiasi salvataggio va a buon fine ma non ha
-- nessuna riga da aggiornare, quindi sembra "non salvare mai" pur senza dare errore. Backfill
-- una tantum: crea le righe mancanti con i valori di default.

insert into shop_settings (company_id, max_daily_time_off)
select id, null from companies
where id not in (select company_id from shop_settings);

insert into opening_hours (company_id, weekday, closed, open_time, close_time)
select c.id, wd, wd = 7, '09:00', '20:00'
from companies c
cross join generate_series(1, 7) as wd
where not exists (
  select 1 from opening_hours oh where oh.company_id = c.id and oh.weekday = wd
);

-- Rende il salvataggio delle impostazioni negozio "auto-riparante": se la riga di un'azienda
-- dovesse mai mancare di nuovo, la crea invece di aggiornare zero righe in silenzio.
create or replace function update_shop_settings(p_max_daily_time_off integer)
returns void
language sql
security invoker
set search_path = public
as $$
  insert into shop_settings (company_id, max_daily_time_off)
  values (current_company_id(), p_max_daily_time_off)
  on conflict (company_id) do update set max_daily_time_off = excluded.max_daily_time_off;
$$;
