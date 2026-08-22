import { supabase } from '@/src/lib/supabase';
import { OpeningHours, ShopSettings, Weekday } from '@/src/models';

interface OpeningHoursRow {
  id: string;
  weekday: Weekday;
  closed: boolean;
  open_time: string;
  close_time: string;
}

function mapRow(row: OpeningHoursRow): OpeningHours {
  return {
    id: row.id,
    weekday: row.weekday,
    closed: row.closed,
    openTime: row.open_time,
    closeTime: row.close_time,
  };
}

export async function listOpeningHours(): Promise<OpeningHours[]> {
  const { data, error } = await supabase.from('opening_hours').select('*').order('weekday');
  if (error) throw error;
  return (data ?? []).map(mapRow);
}

export async function updateOpeningHours(entry: OpeningHours): Promise<void> {
  const { error } = await supabase
    .from('opening_hours')
    .update({ closed: entry.closed, open_time: entry.openTime, close_time: entry.closeTime })
    .eq('id', entry.id);
  if (error) throw error;
}

/**
 * Le impostazioni del negozio hanno un'unica riga per azienda (chiave primaria = azienda
 * stessa), quindi si leggono/scrivono tramite due funzioni dedicate: così il client non
 * deve conoscere l'id della propria azienda per accedervi.
 */
export async function getShopSettings(): Promise<ShopSettings> {
  const { data, error } = await supabase.rpc('get_shop_settings');
  if (error) throw error;
  const row = data?.[0] as { max_daily_time_off: number | null } | undefined;
  return { maxDailyTimeOff: row?.max_daily_time_off ?? undefined };
}

export async function updateShopSettings(settings: ShopSettings): Promise<void> {
  const { error } = await supabase.rpc('update_shop_settings', {
    p_max_daily_time_off: settings.maxDailyTimeOff ?? null,
  });
  if (error) throw error;
}
