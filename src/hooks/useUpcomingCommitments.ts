import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { getLocalToday } from '../lib/billStatusStyles';
import type { Transaction } from '../types/database';

const LIMIT = 50;

/**
 * Despesas com data futura (parcelas e contas agendadas), independente do mês exibido no painel.
 */
export function useUpcomingCommitments() {
  const { user, isDemoMode } = useAuth();
  const [commitments, setCommitments] = useState<Transaction[]>([]);

  const fetchCommitments = useCallback(async () => {
    if (isDemoMode || !user) {
      setCommitments([]);
      return;
    }

    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .eq('type', 'expense')
      .eq('is_invoice_payment', false)
      .gt('transaction_date', getLocalToday())
      .order('transaction_date', { ascending: true })
      .limit(LIMIT);

    if (!error && data) setCommitments(data as Transaction[]);
  }, [user, isDemoMode]);

  useEffect(() => {
    fetchCommitments();
  }, [fetchCommitments]);

  return { commitments, refetch: fetchCommitments };
}
