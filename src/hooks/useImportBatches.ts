import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { ImportBatch, PaymentMethod } from '../types/database';
import type { ParsedTransactionRow } from '../lib/fileParser';

const INITIAL_DEMO_BATCHES: ImportBatch[] = [
  {
    id: 'demo-batch-1',
    user_id: 'demo-user-id-00000000',
    filename: 'extrato-nubank-outubro.csv',
    file_hash: 'hash-abc-123',
    source_type: 'csv',
    total_records: 14,
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export function useImportBatches() {
  const { user, isDemoMode } = useAuth();
  const [batches, setBatches] = useState<ImportBatch[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBatches = useCallback(async () => {
    if (isDemoMode) {
      setBatches(INITIAL_DEMO_BATCHES);
      setLoading(false);
      return;
    }

    if (!user) {
      setBatches([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('import_batches')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setBatches(data as ImportBatch[]);
      }
    } catch (err) {
      console.error('Erro ao buscar lotes de importação:', err);
    } finally {
      setLoading(false);
    }
  }, [user, isDemoMode]);

  useEffect(() => {
    fetchBatches();
  }, [fetchBatches]);

  const commitImportBatch = async (
    filename: string,
    rows: ParsedTransactionRow[],
    destination: { accountId?: string | null; creditCardId?: string | null }
  ) => {
    const selectedRows = rows.filter((r) => r.selected);
    if (selectedRows.length === 0) {
      return { count: 0, error: new Error('Nenhuma linha selecionada para importação') };
    }

    if (isDemoMode) {
      const newBatch: ImportBatch = {
        id: `demo-batch-${Date.now()}`,
        user_id: user?.id || 'demo-user',
        filename,
        file_hash: `hash-${Date.now()}`,
        source_type: 'csv',
        total_records: selectedRows.length,
        created_at: new Date().toISOString(),
      };
      setBatches((prev) => [newBatch, ...prev]);
      return { count: selectedRows.length, error: null };
    }

    if (!user) return { count: 0, error: new Error('Usuário não autenticado') };

    try {
      // 1. Cria o registro do lote em import_batches
      const { data: batchData, error: batchError } = await supabase
        .from('import_batches')
        .insert({
          user_id: user.id,
          filename,
          source_type: 'csv',
          total_records: selectedRows.length,
        })
        .select()
        .single();

      if (batchError) throw batchError;

      // 2. Prepara os registros de transações
      const transactionsToInsert = selectedRows.map((r) => ({
        user_id: user.id,
        account_id: destination.accountId || null,
        credit_card_id: destination.creditCardId || null,
        category_id: r.suggestedCategoryId || null,
        import_batch_id: batchData.id,
        description: r.description,
        amount: r.amount,
        type: r.type,
        payment_method: (destination.creditCardId ? 'credit' : 'debit') as PaymentMethod,
        transaction_date: r.normalizedDate,
        is_paid: true,
        is_invoice_payment: false,
      }));

      const { error: txError } = await supabase
        .from('transactions')
        .insert(transactionsToInsert);

      if (txError) throw txError;

      await fetchBatches();
      return { count: selectedRows.length, error: null };
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error('Erro ao salvar lote');
      return { count: 0, error };
    }
  };

  return {
    batches,
    loading,
    refetch: fetchBatches,
    commitImportBatch,
  };
}
