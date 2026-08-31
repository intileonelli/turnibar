import { supabase } from '@/src/lib/supabase';
import { ShopSettings } from '@/src/models';

export interface UnclaimedEmployee {
  id: string;
  name: string;
}

/** Elenco dei dipendenti di un'azienda non ancora collegati a un account, dato il suo codice. */
export async function listUnclaimedEmployees(inviteCode: string): Promise<UnclaimedEmployee[]> {
  const { data, error } = await supabase.rpc('list_unclaimed_employees', {
    p_invite_code: inviteCode.trim().toLowerCase(),
  });
  if (error) throw error;
  return data ?? [];
}

/** Completa la registrazione di un dipendente collegando il suo account al dipendente scelto. */
export async function claimEmployeeIdentity(
  inviteCode: string,
  employeeId: string,
  fullName: string
): Promise<void> {
  const { error } = await supabase.rpc('claim_employee_identity', {
    p_invite_code: inviteCode.trim().toLowerCase(),
    p_employee_id: employeeId,
    p_full_name: fullName,
  });
  if (error) throw error;
}

/** Cambia a quale dipendente è collegato un account già registrato. Solo il titolare può usarla. */
export async function reassignEmployeeLink(profileId: string, employeeId: string): Promise<void> {
  const { error } = await supabase.rpc('reassign_employee_link', {
    p_profile_id: profileId,
    p_employee_id: employeeId,
  });
  if (error) throw error;
}

export interface CompanyInfo {
  id: string;
  name: string;
  inviteCode: string;
  /** Profilo del titolare che ha creato l'azienda: solo lui può nominare/rimuovere amministratori. */
  founderProfileId: string;
}

export async function getMyCompany(): Promise<CompanyInfo | null> {
  const { data, error } = await supabase.from('companies').select('*').maybeSingle();
  if (error) throw error;
  return data
    ? { id: data.id, name: data.name, inviteCode: data.invite_code, founderProfileId: data.founder_profile_id }
    : null;
}

/** Cambia il nome dell'azienda (mostrato nella Home al posto di "Turnibar"). Solo il titolare può usarla. */
export async function updateCompanyName(companyId: string, name: string): Promise<void> {
  const { error } = await supabase.from('companies').update({ name }).eq('id', companyId);
  if (error) throw error;
}

function generateInviteCode(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

/** Genera e salva un nuovo codice azienda, invalidando quello precedente. */
export async function regenerateInviteCode(companyId: string): Promise<string> {
  const code = generateInviteCode();
  const { error } = await supabase.from('companies').update({ invite_code: code }).eq('id', companyId);
  if (error) throw error;
  return code;
}

export interface EmployeeProfile {
  id: string;
  fullName: string;
}

/** Elenco degli account dipendente registrati in azienda (per la schermata di gestione accessi del titolare). */
export async function listEmployeeProfiles(): Promise<EmployeeProfile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('role', 'employee')
    .order('full_name');
  if (error) throw error;
  return (data ?? []).map((row) => ({ id: row.id, fullName: row.full_name }));
}

export interface CompanyProfile {
  id: string;
  fullName: string;
  role: 'owner' | 'employee';
}

/** Tutti gli account registrati in azienda (titolare/amministratori inclusi), per gestire chi ha accesso da amministratore. */
export async function listCompanyProfiles(): Promise<CompanyProfile[]> {
  const { data, error } = await supabase.from('profiles').select('id, full_name, role').order('full_name');
  if (error) throw error;
  return (data ?? []).map((row) => ({ id: row.id, fullName: row.full_name, role: row.role }));
}

/**
 * Nomina o rimuove un amministratore (stesso accesso completo del titolare). Solo il titolare
 * che ha creato l'azienda può usarla; la funzione lato database applica anche questo controllo.
 */
export async function setAdminStatus(profileId: string, isAdmin: boolean): Promise<void> {
  const { error } = await supabase.rpc('set_admin_status', { p_profile_id: profileId, p_is_admin: isAdmin });
  if (error) throw error;
}

/**
 * Aggiorna le impostazioni di lettura personali (dimensione/colore del testo) del profilo
 * collegato: chiunque può cambiare le proprie, titolare o dipendente.
 */
export async function updateOwnFontSettings(fontScale: number, fontColor: string | undefined): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error('Nessun utente collegato.');
  const { error } = await supabase
    .from('profiles')
    .update({ font_scale: fontScale, font_color: fontColor ?? null })
    .eq('id', auth.user.id);
  if (error) throw error;
}

/**
 * Salva le preferenze di colori/sfondo/motivo/ombre personali (non dell'azienda): chiunque può
 * cambiare le proprie, titolare o dipendente, esattamente come per dimensione/colore del testo.
 * Aggiorna solo i campi presenti in `theme` (`in`, non un semplice controllo di verità: 0 è un
 * valore valido per opacità/intensità ombre), lasciando invariati gli altri.
 */
export async function updateOwnThemeSettings(theme: Partial<ShopSettings>): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error('Nessun utente collegato.');
  const patch: Record<string, unknown> = {};
  if ('primaryColor' in theme) patch.theme_primary_color = theme.primaryColor ?? null;
  if ('accentColor' in theme) patch.theme_accent_color = theme.accentColor ?? null;
  if ('backgroundColor' in theme) patch.theme_background_color = theme.backgroundColor ?? null;
  if ('backgroundOpacity' in theme) patch.theme_background_opacity = theme.backgroundOpacity ?? null;
  if ('shadowIntensity' in theme) patch.theme_shadow_intensity = theme.shadowIntensity ?? null;
  if ('backgroundPattern' in theme) patch.theme_background_pattern = theme.backgroundPattern ?? null;
  if ('patternColor1' in theme) patch.theme_pattern_color_1 = theme.patternColor1 ?? null;
  if ('patternColor2' in theme) patch.theme_pattern_color_2 = theme.patternColor2 ?? null;
  const { error } = await supabase.from('profiles').update(patch).eq('id', auth.user.id);
  if (error) throw error;
}

/** Cancella tutte le preferenze di tema personali: da quel momento l'account torna a vedere il tema dell'azienda. */
export async function resetOwnThemeSettings(): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error('Nessun utente collegato.');
  const { error } = await supabase
    .from('profiles')
    .update({
      theme_primary_color: null,
      theme_accent_color: null,
      theme_background_color: null,
      theme_background_opacity: null,
      theme_shadow_intensity: null,
      theme_background_pattern: null,
      theme_pattern_color_1: null,
      theme_pattern_color_2: null,
    })
    .eq('id', auth.user.id);
  if (error) throw error;
}
