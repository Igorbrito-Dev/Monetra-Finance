import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { buildRecurringOccurrences } from '../lib/billRules';
import { getLocalToday } from '../lib/billStatusStyles';
import type { RecurringBill, Transaction, PaymentMethod } from '../types/database';

export interface RecurringBillInput {
  type: 'income' | 'expense';
  description: string;
  amount: number;
  day_of_month: number;
  payment_method?: PaymentMethod;
  category_id?: string | null;
  account_id?: string | null;
  notes?: string | null;
}

function demoBills(): RecurringBill[] {
  const now = new Date().toISOString();
  return [
    {
      id: 'demo-bill-1',
      user_id: 'demo-user-id-00000000',
      type: 'expense',
      description: 'Aluguel',
      amount: 1800,
      day_of_month: 5,
      category_id: null,
      account_id: null,
      credit_card_id: null,
      payment_method: 'boleto',
      notes: 'Vencimento no boleto do condomínio',
      start_date: '2026-01-01',
      end_date: null,
      active: true,
      created_at: now,
      updated_at: now,
    },
  ];
}

/**
 * Contas fixas (receitas/despesas mensais) e suas ocorrências do mês atual e seguinte.
 */
export function useRecurringBills() {
  const { user, isDemoMode } = useAuth();
  const [bills, setBills] = useState<RecurringBill[]>([]);
  const [occurrences, setOccurrences] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    if (isDemoMode) {
      setBills(demoBills());
      setOccurrences([]);
      setLoading(false);
      return;
    }
    if (!user) {
      setBills([]);
      setOccurrences([]);
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const { data: billRows, error: billsError } = await supabase
        .from('recurring_bills')
        .select('*')
        .eq('user_id', user.id)
        .order('day_of_month', { ascending: true });
      if (billsError) throw billsError;

      const allBills = (billRows as RecurringBill[]) || [];
      const today = getLocalToday();
      const monthStart = `${today.slice(0, 7)}-01`;

      const { data: txRows, error: txError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .not('recurring_bill_id', 'is', null)
        .gte('due_date', monthStart)
        .order('due_date', { ascending: true });
      if (txError) throw txError;

      let existing = (txRows as Transaction[]) || [];

      // Garante as ocorrências do mês atual e seguinte (idempotente pelo índice único no banco)
      const existingKeys = new Set(existing.map((t) => `${t.recurring_bill_id}|${t.due_date}`));
      const missing = allBills.flatMap((bill) =>
        buildRecurringOccurrences(bill, today, 1)
          .filter((dueDate) => !existingKeys.has(`${bill.id}|${dueDate}`))
          .map((dueDate) => ({
            user_id: user.id,
            description: bill.description,
            amount: Number(bill.amount),
            type: bill.type,
            payment_method: bill.payment_method,
            transaction_date: dueDate,
            due_date: dueDate,
            is_paid: false,
            is_recurrent: true,
            recurring_bill_id: bill.id,
            account_id: bill.account_id,
            credit_card_id: bill.credit_card_id,
            category_id: bill.category_id,
            notes: bill.notes,
          }))
      );

      if (missing.length > 0) {
        const { data: created } = await supabase.from('transactions').insert(missing).select();
        if (created) {
          existing = [...existing, ...(created as Transaction[])].sort((a, b) =>
            (a.due_date ?? '').localeCompare(b.due_date ?? '')
          );
        }
      }

      setBills(allBills);
      setOccurrences(existing);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar contas fixas');
    } finally {
      setLoading(false);
    }
  }, [user, isDemoMode]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const createBill = async (input: RecurringBillInput) => {
    if (isDemoMode) {
      const now = new Date().toISOString();
      setBills((prev) => [
        ...prev,
        {
          id: `demo-bill-${Date.now()}`,
          user_id: 'demo-user-id-00000000',
          type: input.type,
          description: input.description,
          amount: input.amount,
          day_of_month: input.day_of_month,
          category_id: input.category_id ?? null,
          account_id: input.account_id ?? null,
          credit_card_id: null,
          payment_method: input.payment_method ?? 'other',
          notes: input.notes ?? null,
          start_date: getLocalToday(),
          end_date: null,
          active: true,
          created_at: now,
          updated_at: now,
        },
      ]);
      return { error: null };
    }
    if (!user) return { error: new Error('Usuário não autenticado') };

    const { error: err } = await supabase.from('recurring_bills').insert({
      user_id: user.id,
      type: input.type,
      description: input.description,
      amount: input.amount,
      day_of_month: input.day_of_month,
      payment_method: input.payment_method ?? 'other',
      category_id: input.category_id ?? null,
      account_id: input.account_id ?? null,
      notes: input.notes ?? null,
      start_date: getLocalToday(),
    });

    if (!err) await fetchAll();
    return { error: err ? new Error(err.message) : null };
  };

  const toggleBillActive = async (id: string, active: boolean) => {
    if (isDemoMode) {
      setBills((prev) => prev.map((b) => (b.id === id ? { ...b, active } : b)));
      return { error: null };
    }
    const { error: err } = await supabase.from('recurring_bills').update({ active }).eq('id', id);
    if (!err) setBills((prev) => prev.map((b) => (b.id === id ? { ...b, active } : b)));
    return { error: err ? new Error(err.message) : null };
  };

  /** Remove a conta fixa e as ocorrências ainda não pagas. */
  const deleteBill = async (id: string) => {
    if (isDemoMode) {
      setBills((prev) => prev.filter((b) => b.id !== id));
      return { error: null };
    }
    await supabase.from('transactions').delete().eq('recurring_bill_id', id).eq('is_paid', false);
    const { error: err } = await supabase.from('recurring_bills').delete().eq('id', id);
    if (!err) await fetchAll();
    return { error: err ? new Error(err.message) : null };
  };

  const setOccurrencePaid = async (id: string, isPaid: boolean) => {
    if (isDemoMode) {
      setOccurrences((prev) => prev.map((t) => (t.id === id ? { ...t, is_paid: isPaid } : t)));
      return { error: null };
    }
    const { error: err } = await supabase.from('transactions').update({ is_paid: isPaid }).eq('id', id);
    if (!err) setOccurrences((prev) => prev.map((t) => (t.id === id ? { ...t, is_paid: isPaid } : t)));
    return { error: err ? new Error(err.message) : null };
  };

  return {
    bills,
    occurrences,
    loading,
    error,
    refetch: fetchAll,
    createBill,
    toggleBillActive,
    deleteBill,
    setOccurrencePaid,
  };
}
