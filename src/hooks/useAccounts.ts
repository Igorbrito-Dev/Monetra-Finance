import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Account, AccountType } from '../types/database';

const INITIAL_DEMO_ACCOUNTS: Account[] = [
  {
    id: 'demo-acc-1',
    user_id: 'demo-user-id-00000000',
    name: 'Nubank (Conta Principal)',
    type: 'checking',
    initial_balance: 3500.0,
    current_balance: 3500.0,
    color: '#820AD1',
    icon: 'wallet',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'demo-acc-2',
    user_id: 'demo-user-id-00000000',
    name: 'Itaú Personalité',
    type: 'checking',
    initial_balance: 12450.8,
    current_balance: 12450.8,
    color: '#EC7000',
    icon: 'building-2',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'demo-acc-3',
    user_id: 'demo-user-id-00000000',
    name: 'Reserva em Tesouro Direto',
    type: 'investment',
    initial_balance: 45000.0,
    current_balance: 45000.0,
    color: '#10B981',
    icon: 'trending-up',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'demo-acc-4',
    user_id: 'demo-user-id-00000000',
    name: 'Carteira Física (Dinheiro)',
    type: 'cash',
    initial_balance: 240.0,
    current_balance: 240.0,
    color: '#64748B',
    icon: 'banknote',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export function useAccounts() {
  const { user, isDemoMode } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAccounts = useCallback(async () => {
    if (isDemoMode) {
      setAccounts(INITIAL_DEMO_ACCOUNTS);
      setLoading(false);
      return;
    }

    if (!user) {
      setAccounts([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const { data, error: err } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (err) throw err;
      setAccounts((data as Account[]) || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao buscar contas';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [user, isDemoMode]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const createAccount = async (accountData: {
    name: string;
    type: AccountType;
    initial_balance: number;
    color?: string;
    icon?: string;
  }) => {
    if (isDemoMode) {
      const newAcc: Account = {
        id: `demo-acc-${Date.now()}`,
        user_id: user?.id || 'demo-user',
        name: accountData.name,
        type: accountData.type,
        initial_balance: accountData.initial_balance,
        current_balance: accountData.initial_balance,
        color: accountData.color || '#3B82F6',
        icon: accountData.icon || 'wallet',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setAccounts((prev) => [newAcc, ...prev]);
      return { data: newAcc, error: null };
    }

    if (!user) return { data: null, error: new Error('Usuário não autenticado') };

    const { data, error: err } = await supabase
      .from('accounts')
      .insert({
        user_id: user.id,
        name: accountData.name,
        type: accountData.type,
        initial_balance: accountData.initial_balance,
        current_balance: accountData.initial_balance,
        color: accountData.color || '#3B82F6',
        icon: accountData.icon || 'wallet',
      })
      .select()
      .single();

    if (!err && data) {
      setAccounts((prev) => [data as Account, ...prev]);
    }
    return { data, error: err };
  };

  const deleteAccount = async (id: string) => {
    if (isDemoMode) {
      setAccounts((prev) => prev.filter((acc) => acc.id !== id));
      return { error: null };
    }

    const { error: err } = await supabase.from('accounts').delete().eq('id', id);
    if (!err) {
      setAccounts((prev) => prev.filter((acc) => acc.id !== id));
    }
    return { error: err };
  };

  return {
    accounts,
    loading,
    error,
    refetch: fetchAccounts,
    createAccount,
    deleteAccount,
  };
}
