import { createContext, PropsWithChildren, useContext } from 'react';
import { Session } from '@supabase/supabase-js';
import { Profile, useAuth } from '@/src/hooks/useAuth';

export interface AuthContextValue {
  session: Session | null;
  profile: Profile | null;
  reloadProfile: () => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Espone sessione/profilo già caricati da AuthGate, evitando di rifare la stessa chiamata altrove. */
export function AuthProvider({ children, value }: PropsWithChildren<{ value: AuthContextValue }>) {
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useCurrentAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useCurrentAuth deve essere usato dentro AuthProvider.');
  return ctx;
}

export { useAuth };
