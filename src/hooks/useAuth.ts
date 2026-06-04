import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

export type AppRole = 'submitter' | 'judge' | 'secretariat' | 'admin' | 'country_representative' | 'super_admin';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setTimeout(async () => {
            const { data: roleData } = await supabase
              .from('user_roles')
              .select('role')
              .eq('user_id', session.user.id)
              .single();
            // Map legacy roles
            let resolvedRole = roleData?.role as string ?? null;
            if (resolvedRole === 'country_coordinator') resolvedRole = 'country_representative';
            if (resolvedRole === 'panel_chair' || resolvedRole === 'global_jury') resolvedRole = 'judge';
            setRole(resolvedRole as AppRole ?? null);

            const { data: profileData } = await supabase
              .from('profiles')
              .select('*')
              .eq('user_id', session.user.id)
              .single();
            setProfile(profileData);
            setLoading(false);
          }, 0);
        } else {
          setRole(null);
          setProfile(null);
          setLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (!session) setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Heartbeat: keep last_seen_at fresh while the user is active in the app
  useEffect(() => {
    if (!user) return;
    const ping = () => {
      supabase.from('profiles').update({ last_seen_at: new Date().toISOString() } as any).eq('user_id', user.id).then(() => {});
    };
    ping();
    const interval = setInterval(ping, 60_000);
    const onVisible = () => { if (document.visibilityState === 'visible') ping(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { clearInterval(interval); document.removeEventListener('visibilitychange', onVisible); };
  }, [user]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };


  const signUp = async (email: string, password: string, fullName: string, country?: string, phone?: string, accountType?: string) => {
    // Both 'applicant' and 'individual' map to submitter role
    const resolvedAccountType = accountType === 'individual' ? 'individual' : accountType || 'applicant';
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, country, phone, account_type: resolvedAccountType },
        emailRedirectTo: 'https://portal.transformingeducation.ac/dashboard',
      },
    });
    return { error };
  };

  const signOut = async () => {
    if (user) {
      await supabase.from('profiles').update({ last_sign_out_at: new Date().toISOString() } as any).eq('user_id', user.id);
    }
    await supabase.auth.signOut();
  };


  return { user, session, role, profile, loading, signIn, signUp, signOut };
}
