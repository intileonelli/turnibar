import { supabase } from '@/src/lib/supabase';

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
