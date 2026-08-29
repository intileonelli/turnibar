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
  const row = data?.[0] as
    | {
        max_daily_time_off: number | null;
        allow_multiple_shifts_per_day: boolean;
        primary_color: string | null;
        accent_color: string | null;
        background_color: string | null;
        background_opacity: number | null;
        shadow_intensity: number | null;
      }
    | undefined;
  return {
    maxDailyTimeOff: row?.max_daily_time_off ?? undefined,
    allowMultipleShiftsPerDay: row?.allow_multiple_shifts_per_day ?? false,
    primaryColor: row?.primary_color ?? undefined,
    accentColor: row?.accent_color ?? undefined,
    backgroundColor: row?.background_color ?? undefined,
    backgroundOpacity: row?.background_opacity ?? undefined,
    shadowIntensity: row?.shadow_intensity ?? undefined,
  };
}

export async function updateShopSettings(settings: ShopSettings): Promise<void> {
  const { error } = await supabase.rpc('update_shop_settings', {
    p_max_daily_time_off: settings.maxDailyTimeOff ?? null,
    p_allow_multiple_shifts_per_day: settings.allowMultipleShiftsPerDay,
    p_primary_color: settings.primaryColor ?? null,
    p_accent_color: settings.accentColor ?? null,
    p_background_color: settings.backgroundColor ?? null,
    p_background_opacity: settings.backgroundOpacity ?? null,
    p_shadow_intensity: settings.shadowIntensity ?? null,
  });
  if (error) throw error;
}
