import { Session } from '@supabase/supabase-js';
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';

export type Profile = {
  id: string;
  handle: string;
  avatarUrl: string | null;
  isAnonymous: boolean;
  verified: boolean;
  isAdmin: boolean;
};

type AuthValue = {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  linkEmail: (email: string) => Promise<void>;
  verifyEmailOtp: (email: string, token: string) => Promise<void>;
  updateHandle: (handle: string) => Promise<void>;
  updateAvatar: (url: string | null) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  deleteAccount: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

async function loadProfile(session: Session | null, setProfile: (p: Profile | null) => void): Promise<void> {
  if (!session) {
    setProfile(null);
    return;
  }
  const { data, error } = await supabase
    .from('profiles')
    .select('id, handle, avatar_url, is_anonymous, verified, is_admin')
    .eq('id', session.user.id)
    .single();
  if (error) {
    console.warn('Failed to load profile', error);
    return;
  }
  if (data) {
    setProfile({
      id: data.id,
      handle: data.handle,
      avatarUrl: data.avatar_url,
      isAnonymous: data.is_anonymous,
      verified: data.verified,
      isAdmin: data.is_admin,
    });
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.warn('Auth bootstrap failed', error);
      }
      let current = data.session;
      if (!current) {
        const { data: anon, error: anonError } = await supabase.auth.signInAnonymously();
        if (anonError) {
          console.warn('Auth bootstrap failed', anonError);
        }
        current = anon.session;
      }
      if (active) {
        setSession(current);
        setLoading(false);
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (event === 'SIGNED_OUT') {
        supabase.auth.signInAnonymously().catch((e) =>
          console.warn('Re-anonymize failed', e),
        );
      }
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let active = true;
    loadProfile(session, (p) => {
      if (active) setProfile(p);
    });
    return () => {
      active = false;
    };
  }, [session]);

  const value: AuthValue = {
    session,
    profile,
    loading,
    linkEmail: async (email) => {
      const { error } = await supabase.auth.updateUser({ email });
      if (error) throw error;
    },
    verifyEmailOtp: async (email, token) => {
      const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email_change' });
      if (error) throw error;
      await loadProfile(session, setProfile);
    },
    updateHandle: async (handle) => {
      if (!session) return;
      const { error } = await supabase.from('profiles').update({ handle }).eq('id', session.user.id);
      if (error) throw error;
      setProfile((p) => (p ? { ...p, handle } : p));
    },
    updateAvatar: async (url) => {
      if (!session) return;
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: url })
        .eq('id', session.user.id);
      if (error) throw error;
      setProfile((p) => (p ? { ...p, avatarUrl: url } : p));
    },
    signOut: async () => {
      await supabase.auth.signOut();
    },
    refreshProfile: async () => {
      await loadProfile(session, setProfile);
    },
    deleteAccount: async () => {
      const { error } = await supabase.rpc('delete_my_account');
      if (error) throw error;
      await supabase.auth.signOut();
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
