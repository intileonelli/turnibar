import { useEffect, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/src/lib/supabase';

export type UserRole = 'owner' | 'employee';

export interface Profile {
  id: string;
  companyId: string;
  role: UserRole;
  fullName: string;
}

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setSessionLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const reloadProfile = async () => {
    if (!session) {
      setProfile(null);
      setProfileLoading(false);
      return;
    }
    setProfileLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('id, company_id, role, full_name')
      .eq('id', session.user.id)
      .maybeSingle();
    setProfile(
      data
        ? { id: data.id, companyId: data.company_id, role: data.role, fullName: data.full_name }
        : null
    );
    setProfileLoading(false);
  };

  useEffect(() => {
    reloadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  return {
    session,
    profile,
    loading: sessionLoading || profileLoading,
    reloadProfile,
    signOut: () => supabase.auth.signOut(),
  };
}
