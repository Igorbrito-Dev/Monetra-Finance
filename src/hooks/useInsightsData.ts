import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Transaction } from '../types/database';

const MONTHS_BACK = 5;

function monthStartIso(monthsBack: number): string {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - monthsBack);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

function nextMonthEndIso(): string {
  const d = new Date();
  const end = new Date(d.getFullYear(), d.getMonth() + 2, 0);
  return `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;
}

/**
 * Histórico dos últimos 6 meses (e compromissos até o fim do próximo mês) usado nos indicadores,
 * sugestões de descrição, detecção de gasto atípico e de assinaturas.
 */
export function useInsightsData() {
  const { user, isDemoMode } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (isDemoMode || !user) {
      setTransactions([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .gte('transaction_date', monthStartIso(MONTHS_BACK))
      .lte('transaction_date', nextMonthEndIso())
      .order('transaction_date', { ascending: false })
      .limit(5000);

    if (!error && data) setTransactions(data as Transaction[]);
    setLoading(false);
  }, [user, isDemoMode]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { transactions, loading, refetch: fetchData };
}
