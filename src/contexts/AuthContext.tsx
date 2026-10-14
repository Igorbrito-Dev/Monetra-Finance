import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { Profile } from '../types/database';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  isConfigured: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  refreshProfile: () => Promise<void>;
  updateMonthlyBudget: (budget: number) => Promise<{ error: Error | null }>;
  updateNotificationSettings: (settings: NotificationSettings) => Promise<{ error: Error | null }>;
  enterDemoMode: () => void;
  isDemoMode: boolean;
}

export interface NotificationSettings {
  daily_report_enabled: boolean;
  daily_report_hour: number;
  bill_reminder_days: number;
  card_reminder_days: number;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(false);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (!error && data) {
        setProfile(data as Profile);
      }
    } catch (err) {
      console.error('Erro ao buscar perfil do usuário:', err);
    }
  };

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    // Obter sessão inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      setLoading(false);
    });

    // Escutar alterações de autenticação
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ? new Error(error.message) : null };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });
    return { error: error ? new Error(error.message) : null };
  };

  const signOut = async () => {
    if (isDemoMode) {
      setIsDemoMode(false);
      setUser(null);
      setProfile(null);
      return;
    }
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    return { error: error ? new Error(error.message) : null };
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  const updateMonthlyBudget = async (budget: number) => {
    if (isDemoMode) {
      setProfile((prev) => prev ? { ...prev, monthly_budget: budget } : null);
      return { error: null };
    }
    if (!user) return { error: new Error('Não autenticado') };

    const { error } = await supabase
      .from('profiles')
      .update({ monthly_budget: budget })
      .eq('id', user.id);

    if (!error) {
      setProfile((prev) => prev ? { ...prev, monthly_budget: budget } : null);
    }
    return { error };
  };

  const updateNotificationSettings = async (settings: NotificationSettings) => {
    if (isDemoMode) {
      setProfile((prev) => (prev ? { ...prev, ...settings } : null));
      return { error: null };
    }
    if (!user) return { error: new Error('Não autenticado') };

    const { error } = await supabase.from('profiles').update(settings).eq('id', user.id);

    if (!error) {
      setProfile((prev) => (prev ? { ...prev, ...settings } : null));
    }
    return { error: error ? new Error(error.message) : null };
  };

  const enterDemoMode = () => {
    setIsDemoMode(true);
    const mockUser = {
      id: 'demo-user-id-00000000',
      email: 'investidor@monetra.com.br',
      app_metadata: {},
      user_metadata: { full_name: 'Usuário Demonstração' },
      aud: 'authenticated',
      created_at: new Date().toISOString(),
    } as unknown as User;

    setUser(mockUser);
    setProfile({
      id: 'demo-user-id-00000000',
      full_name: 'Investidor Monetra',
      avatar_url: null,
      telegram_chat_id: 123456789,
      preferred_currency: 'BRL',
      monthly_budget: 3500.00,
      daily_report_enabled: true,
      daily_report_hour: 20,
      bill_reminder_days: 1,
      card_reminder_days: 2,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        isConfigured: isSupabaseConfigured,
        signIn,
        signUp,
        signOut,
        resetPassword,
        refreshProfile,
        updateMonthlyBudget,
        updateNotificationSettings,
        enterDemoMode,
        isDemoMode,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de um AuthProvider');
  }
  return context;
};
