import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { computeCardUsage, type CardUsageTransaction } from '../lib/cardUsage';
import { getLocalToday } from '../lib/billStatusStyles';

/** Quanto do limite de cada cartão está comprometido (fatura em aberto + parcelas futuras). */
export function useCardUsage() {
  const { user, isDemoMode } = useAuth();
  const [usage, setUsage] = useState<Map<string, number>>(new Map());

  const fetchUsage = useCallback(async () => {
    const today = getLocalToday();

    if (isDemoMode) {
      setUsage(new Map([['demo-card-1', 2289.45], ['demo-card-2', 540]]));
      return;
    }
    if (!user) {
      setUsage(new Map());
      return;
    }

    const { data, error } = await supabase
      .from('transactions')
      .select('credit_card_id, amount, type, is_paid, is_invoice_payment, transaction_date')
      .eq('user_id', user.id)
      .eq('type', 'expense')
      .eq('is_invoice_payment', false)
      .not('credit_card_id', 'is', null)
      .or(`is_paid.eq.false,transaction_date.gt.${today}`);

    if (!error && data) {
      setUsage(computeCardUsage(data as CardUsageTransaction[], today));
    }
  }, [user, isDemoMode]);

  useEffect(() => {
    fetchUsage();
  }, [fetchUsage]);

  return { usage, refetch: fetchUsage };
}
