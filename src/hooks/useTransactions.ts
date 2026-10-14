import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { splitInstallmentAmounts, generateInstallmentDates } from '../lib/financeRules';
import { generateCardInstallmentSchedule } from '../lib/creditCardRules';
import type { Transaction, TransactionType, PaymentMethod } from '../types/database';

const CURRENT_DATE = new Date();
const CURRENT_YEAR = CURRENT_DATE.getFullYear();
const CURRENT_MONTH = CURRENT_DATE.getMonth() + 1;

const INITIAL_DEMO_TRANSACTIONS: Transaction[] = [
  {
    id: 'demo-tx-1',
    user_id: 'demo-user-id-00000000',
    account_id: 'demo-acc-1',
    credit_card_id: null,
    category_id: 'demo-cat-9',
    import_batch_id: null,
    description: 'Salário Mensal — Tech Corp',
    amount: 14500.0,
    type: 'income',
    payment_method: 'transfer',
    transaction_date: `${CURRENT_YEAR}-${String(CURRENT_MONTH).padStart(2, '0')}-05`,
    due_date: null,
    is_paid: true,
    is_recurrent: true,
    installment_number: null,
    total_installments: null,
    installment_group_id: null,
    is_invoice_payment: false,
    external_id: null,
    recurring_bill_id: null,
    notes: 'Depósito em conta corrente Nubank',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'demo-tx-2',
    user_id: 'demo-user-id-00000000',
    account_id: null,
    credit_card_id: 'demo-card-1',
    category_id: 'demo-cat-1',
    import_batch_id: null,
    description: 'Supermercado Pão de Açúcar',
    amount: 489.65,
    type: 'expense',
    payment_method: 'credit',
    transaction_date: `${CURRENT_YEAR}-${String(CURRENT_MONTH).padStart(2, '0')}-08`,
    due_date: null,
    is_paid: true,
    is_recurrent: false,
    installment_number: null,
    total_installments: null,
    installment_group_id: null,
    is_invoice_payment: false,
    external_id: null,
    recurring_bill_id: null,
    notes: 'Compras da semana',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'demo-tx-3',
    user_id: 'demo-user-id-00000000',
    account_id: null,
    credit_card_id: 'demo-card-1',
    category_id: 'demo-cat-8',
    import_batch_id: null,
    description: 'Notebook Dell XPS 15 (Parcela 1/5)',
    amount: 1799.8,
    type: 'expense',
    payment_method: 'credit',
    transaction_date: `${CURRENT_YEAR}-${String(CURRENT_MONTH).padStart(2, '0')}-10`,
    due_date: null,
    is_paid: true,
    is_recurrent: false,
    installment_number: 1,
    total_installments: 5,
    installment_group_id: 'demo-group-notebook',
    is_invoice_payment: false,
    external_id: null,
    recurring_bill_id: null,
    notes: 'Compra de equipamento de trabalho parcelada em 5x',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'demo-tx-4',
    user_id: 'demo-user-id-00000000',
    account_id: 'demo-acc-1',
    credit_card_id: null,
    category_id: 'demo-cat-3',
    import_batch_id: null,
    description: 'Abastecimento Posto Shell (Pix)',
    amount: 220.0,
    type: 'expense',
    payment_method: 'pix',
    transaction_date: `${CURRENT_YEAR}-${String(CURRENT_MONTH).padStart(2, '0')}-12`,
    due_date: null,
    is_paid: true,
    is_recurrent: false,
    installment_number: null,
    total_installments: null,
    installment_group_id: null,
    is_invoice_payment: false,
    external_id: null,
    recurring_bill_id: null,
    notes: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export interface TransactionFilter {
  year: number;
  month: number;
  type?: 'all' | 'income' | 'expense' | 'transfer';
  accountId?: string;
  cardId?: string;
  categoryId?: string;
  search?: string;
}

export function useTransactions(initialFilter?: Partial<TransactionFilter>) {
  const { user, isDemoMode } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filter, setFilter] = useState<TransactionFilter>({
    year: initialFilter?.year ?? CURRENT_YEAR,
    month: initialFilter?.month ?? CURRENT_MONTH,
    type: initialFilter?.type ?? 'all',
    accountId: initialFilter?.accountId,
    cardId: initialFilter?.cardId,
    categoryId: initialFilter?.categoryId,
    search: initialFilter?.search ?? '',
  });

  const fetchTransactions = useCallback(async () => {
    if (isDemoMode) {
      setTransactions(INITIAL_DEMO_TRANSACTIONS);
      setLoading(false);
      return;
    }

    if (!user) {
      setTransactions([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Limites do mês
      const startDate = `${filter.year}-${String(filter.month).padStart(2, '0')}-01`;
      const endDay = new Date(filter.year, filter.month, 0).getDate();
      const endDate = `${filter.year}-${String(filter.month).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`;

      let query = supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .gte('transaction_date', startDate)
        .lte('transaction_date', endDate)
        .order('transaction_date', { ascending: false });

      if (filter.type && filter.type !== 'all') {
        query = query.eq('type', filter.type);
      }
      if (filter.accountId) {
        query = query.eq('account_id', filter.accountId);
      }
      if (filter.cardId) {
        query = query.eq('credit_card_id', filter.cardId);
      }
      if (filter.categoryId) {
        query = query.eq('category_id', filter.categoryId);
      }

      const { data, error: err } = await query;

      if (err) throw err;
      setTransactions((data as Transaction[]) || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao buscar transações';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [user, isDemoMode, filter.year, filter.month, filter.type, filter.accountId, filter.cardId, filter.categoryId]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const createTransaction = async (formData: {
    description: string;
    amount: number;
    type: TransactionType;
    payment_method: PaymentMethod;
    transaction_date: string;
    account_id?: string | null;
    credit_card_id?: string | null;
    category_id?: string | null;
    is_paid?: boolean;
    is_invoice_payment?: boolean;
    installments_count?: number;
    notes?: string;
    /** Dias de fechamento/vencimento do cartão: quando informados, a compra no crédito é lançada nas faturas corretas */
    card_closing_day?: number;
    card_due_day?: number;
  }) => {
    const isInstallment = formData.installments_count && formData.installments_count > 1;
    const installmentsCount = isInstallment ? formData.installments_count! : 1;

    const useCardInvoices =
      formData.payment_method === 'credit' &&
      formData.type === 'expense' &&
      !formData.is_invoice_payment &&
      !!formData.credit_card_id &&
      !!formData.card_closing_day &&
      !!formData.card_due_day;

    const installmentAmounts = splitInstallmentAmounts(formData.amount, installmentsCount);
    // No cartão, cada parcela é datada no vencimento da fatura em que cai; nos demais casos, mês a mês.
    const installmentDates = useCardInvoices
      ? generateCardInstallmentSchedule(
          formData.transaction_date,
          formData.card_closing_day!,
          formData.card_due_day!,
          installmentsCount
        ).map((invoice) => invoice.dueDate)
      : generateInstallmentDates(formData.transaction_date, installmentsCount);
    const groupId = isInstallment ? crypto.randomUUID() : null;
    const [purchaseYear, purchaseMonth, purchaseDay] = formData.transaction_date.split('-');
    const purchaseNote = useCardInvoices
      ? `Compra em ${purchaseDay}/${purchaseMonth}/${purchaseYear}${isInstallment ? ` — ${installmentsCount}x` : ''}`
      : null;
    const buildNotes = () =>
      [formData.notes?.trim(), purchaseNote].filter(Boolean).join(' | ') || null;

    if (isDemoMode) {
      const newItems: Transaction[] = [];

      for (let i = 0; i < installmentsCount; i++) {
        const itemDescription = isInstallment
          ? `${formData.description} (Parcela ${i + 1}/${installmentsCount})`
          : formData.description;

        const newTx: Transaction = {
          id: `demo-tx-${Date.now()}-${i}`,
          user_id: user?.id || 'demo-user',
          account_id: formData.account_id ?? null,
          credit_card_id: formData.credit_card_id ?? null,
          category_id: formData.category_id ?? null,
          import_batch_id: null,
          description: itemDescription,
          amount: installmentAmounts[i],
          type: formData.type,
          payment_method: formData.payment_method,
          transaction_date: installmentDates[i],
          due_date: useCardInvoices ? installmentDates[i] : null,
          is_paid: formData.is_paid ?? true,
          is_recurrent: false,
          installment_number: isInstallment ? i + 1 : null,
          total_installments: isInstallment ? installmentsCount : null,
          installment_group_id: groupId,
          is_invoice_payment: formData.is_invoice_payment ?? false,
          external_id: null,
          recurring_bill_id: null,
          notes: buildNotes(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        newItems.push(newTx);
      }

      setTransactions((prev) => [...newItems, ...prev]);
      return { data: newItems, error: null };
    }

    if (!user) return { data: null, error: new Error('Usuário não autenticado') };

    const recordsToInsert = [];
    for (let i = 0; i < installmentsCount; i++) {
      const itemDescription = isInstallment
        ? `${formData.description} (Parcela ${i + 1}/${installmentsCount})`
        : formData.description;

      recordsToInsert.push({
        user_id: user.id,
        account_id: formData.account_id ?? null,
        credit_card_id: formData.credit_card_id ?? null,
        category_id: formData.category_id ?? null,
        description: itemDescription,
        amount: installmentAmounts[i],
        type: formData.type,
        payment_method: formData.payment_method,
        transaction_date: installmentDates[i],
        due_date: useCardInvoices ? installmentDates[i] : null,
        is_paid: formData.is_paid ?? true,
        installment_number: isInstallment ? i + 1 : null,
        total_installments: isInstallment ? installmentsCount : null,
        installment_group_id: groupId,
        is_invoice_payment: formData.is_invoice_payment ?? false,
        notes: buildNotes(),
      });
    }

    const { data, error: err } = await supabase
      .from('transactions')
      .insert(recordsToInsert)
      .select();

    if (!err && data) {
      setTransactions((prev) => [...(data as Transaction[]), ...prev]);
    }

    return { data, error: err };
  };

  const togglePaidStatus = async (id: string, currentStatus: boolean) => {
    if (isDemoMode) {
      setTransactions((prev) =>
        prev.map((t) => (t.id === id ? { ...t, is_paid: !currentStatus } : t))
      );
      return { error: null };
    }

    const { error: err } = await supabase
      .from('transactions')
      .update({ is_paid: !currentStatus })
      .eq('id', id);

    if (!err) {
      setTransactions((prev) =>
        prev.map((t) => (t.id === id ? { ...t, is_paid: !currentStatus } : t))
      );
    }
    return { error: err };
  };

  const updateTransaction = async (
    id: string,
    patch: {
      description?: string;
      amount?: number;
      type?: TransactionType;
      payment_method?: PaymentMethod;
      transaction_date?: string;
      due_date?: string | null;
      account_id?: string | null;
      credit_card_id?: string | null;
      category_id?: string | null;
      is_paid?: boolean;
      notes?: string | null;
    }
  ) => {
    if (isDemoMode) {
      setTransactions((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
      return { error: null };
    }

    const { data, error: err } = await supabase
      .from('transactions')
      .update(patch)
      .eq('id', id)
      .select()
      .single();

    if (!err && data) {
      setTransactions((prev) => prev.map((t) => (t.id === id ? (data as Transaction) : t)));
    }
    return { error: err };
  };

  /** Altera vários lançamentos de uma vez (ex.: trocar a categoria). */
  const bulkUpdate = async (ids: string[], patch: { category_id?: string | null; is_paid?: boolean }) => {
    if (ids.length === 0) return { error: null };

    if (isDemoMode) {
      setTransactions((prev) => prev.map((t) => (ids.includes(t.id) ? { ...t, ...patch } : t)));
      return { error: null };
    }

    const { error: err } = await supabase.from('transactions').update(patch).in('id', ids);
    if (!err) {
      setTransactions((prev) => prev.map((t) => (ids.includes(t.id) ? { ...t, ...patch } : t)));
    }
    return { error: err };
  };

  const bulkDelete = async (ids: string[]) => {
    if (ids.length === 0) return { error: null };

    if (isDemoMode) {
      setTransactions((prev) => prev.filter((t) => !ids.includes(t.id)));
      return { error: null };
    }

    const { error: err } = await supabase.from('transactions').delete().in('id', ids);
    if (!err) {
      setTransactions((prev) => prev.filter((t) => !ids.includes(t.id)));
    }
    return { error: err };
  };

  const deleteTransaction = async (id: string, deleteGroup = false) => {
    const target = transactions.find((t) => t.id === id);

    if (isDemoMode) {
      if (deleteGroup && target?.installment_group_id) {
        setTransactions((prev) =>
          prev.filter((t) => t.installment_group_id !== target.installment_group_id)
        );
      } else {
        setTransactions((prev) => prev.filter((t) => t.id !== id));
      }
      return { error: null };
    }

    if (deleteGroup && target?.installment_group_id) {
      const { error: err } = await supabase
        .from('transactions')
        .delete()
        .eq('installment_group_id', target.installment_group_id);

      if (!err) {
        setTransactions((prev) =>
          prev.filter((t) => t.installment_group_id !== target.installment_group_id)
        );
      }
      return { error: err };
    }

    const { error: err } = await supabase.from('transactions').delete().eq('id', id);
    if (!err) {
      setTransactions((prev) => prev.filter((t) => t.id !== id));
    }
    return { error: err };
  };

  return {
    transactions,
    loading,
    error,
    filter,
    setFilter,
    refetch: fetchTransactions,
    createTransaction,
    togglePaidStatus,
    updateTransaction,
    bulkUpdate,
    bulkDelete,
    deleteTransaction,
  };
}
