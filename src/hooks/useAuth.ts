import { useCallback, useEffect, useRef, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/src/lib/supabase';
import { applyFontColor } from '@/src/components/shared/colors';
import { applyFontScale } from '@/src/components/shared/typography';

export type UserRole = 'owner' | 'employee';

export interface Profile {
  id: string;
  companyId: string;
  role: UserRole;
  fullName: string;
  /** Dimensione del testo scelta personalmente (1 = normale), per chi ha bisogno di caratteri più grandi. */
  fontScale: number;
  /** Colore del testo scelto personalmente (bianco/nero/grigio). Non impostato = colore di default. */
  fontColor?: string;
}

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [initializing, setInitializing] = useState(true);
  const initialized = useRef(false);

  const loadProfile = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('id, company_id, role, full_name, font_scale, font_color')
      .eq('id', userId)
      .maybeSingle();
    // Le impostazioni di lettura personali si applicano non appena si conosce il profilo, prima
    // ancora che l'app vera e propria venga mostrata.
    applyFontScale(data?.font_scale ?? undefined);
    applyFontColor(data?.font_color ?? undefined);
    setProfile(
      data
        ? {
            id: data.id,
            companyId: data.company_id,
            role: data.role,
            fullName: data.full_name,
            fontScale: data.font_scale ?? 1,
            fontColor: data.font_color ?? undefined,
          }
        : null
    );
  }, []);

  useEffect(() => {
    let cancelled = false;

    supabase.auth.getSession().then(async ({ data }) => {
      if (cancelled) return;
      setSession(data.session);
      if (data.session) await loadProfile(data.session.user.id);
      initialized.current = true;
      setInitializing(false);
    });

    // Supabase può emettere eventi "silenziosi" (es. rinnovo del token in background, o al
    // ritorno di focus sulla scheda del browser) che riguardano la STESSA sessione: in quei
    // casi va aggiornato solo il token, senza ricaricare il profilo né mostrare di nuovo la
    // schermata di caricamento (altrimenti l'app "salta" alla Home ad ogni evento).
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession((prev) => {
        const sameUser = prev?.user.id === newSession?.user.id;
        if (!sameUser) {
          if (newSession) {
            loadProfile(newSession.user.id);
          } else {
            setProfile(null);
          }
        }
        return newSession;
      });
    });

    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const reloadProfile = useCallback(async () => {
    if (!session) {
      setProfile(null);
      return;
    }
    await loadProfile(session.user.id);
  }, [session, loadProfile]);

  const signOut = useCallback(() => {
    supabase.auth.signOut();
  }, []);

  return {
    session,
    profile,
    loading: initializing,
    reloadProfile,
    signOut,
  };
}
