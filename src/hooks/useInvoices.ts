import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { groupInvoices, type Invoice } from '../lib/invoices';
import { getLocalToday } from '../lib/billStatusStyles';
import type { Transaction } from '../types/database';

const LOOKBACK_DAYS = 120;

function shiftDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** Faturas dos cartões (últimos 4 meses em diante) e ação de pagar fatura. */
export function useInvoices() {
  const { user, isDemoMode } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInvoices = useCallback(async () => {
    if (isDemoMode || !user) {
      setTransactions([]);
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const since = shiftDays(getLocalToday(), -LOOKBACK_DAYS);
      const { data, error: err } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .eq('type', 'expense')
        .eq('is_invoice_payment', false)
        .not('credit_card_id', 'is', null)
        .gte('transaction_date', since)
        .order('transaction_date', { ascending: true })
        .limit(2000);

      if (err) throw err;
      setTransactions((data as Transaction[]) || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar faturas');
    } finally {
      setLoading(false);
    }
  }, [user, isDemoMode]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const invoices = useMemo<Invoice<Transaction>[]>(
    () => groupInvoices(transactions, getLocalToday()),
    [transactions]
  );

  /**
   * Quita a fatura: cria o pagamento (que debita a conta e não conta como consumo)
   * e marca os lançamentos pendentes dela como pagos.
   */
  const payInvoice = async (params: { invoice: Invoice<Transaction>; accountId: string | null; cardName: string }) => {
    if (!user) return { error: new Error('Usuário não autenticado') };
    const { invoice, accountId, cardName } = params;
    const pendingIds = invoice.items.filter((t) => !t.is_paid).map((t) => t.id);
    if (pendingIds.length === 0 || invoice.outstanding <= 0) {
      return { error: new Error('Esta fatura já está quitada.') };
    }

    const [, month, day] = invoice.dueDate.split('-');

    const { error: insertError } = await supabase.from('transactions').insert({
      user_id: user.id,
      account_id: accountId,
      credit_card_id: invoice.cardId,
      description: `Pagamento fatura ${cardName} (${day}/${month})`,
      amount: invoice.outstanding,
      type: 'expense',
      payment_method: 'transfer',
      transaction_date: getLocalToday(),
      is_paid: true,
      is_invoice_payment: true,
      notes: `Fatura com vencimento em ${day}/${month}`,
    });
    if (insertError) return { error: new Error(insertError.message) };

    const { error: updateError } = await supabase
      .from('transactions')
      .update({ is_paid: true })
      .in('id', pendingIds);
    if (updateError) {
      return {
        error: new Error(
          `O pagamento foi registrado, mas não foi possível marcar os itens como pagos: ${updateError.message}`
        ),
      };
    }

    await fetchInvoices();
    return { error: null };
  };

  return { invoices, loading, error, refetch: fetchInvoices, payInvoice };
}
