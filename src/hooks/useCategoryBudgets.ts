import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { CategoryBudget } from '../types/database';

/** Orçamento mensal por categoria. */
export function useCategoryBudgets() {
  const { user, isDemoMode } = useAuth();
  const [budgets, setBudgets] = useState<CategoryBudget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBudgets = useCallback(async () => {
    if (isDemoMode || !user) {
      setBudgets([]);
      setLoading(false);
      return;
    }

    const { data, error: err } = await supabase
      .from('category_budgets')
      .select('*')
      .eq('user_id', user.id);

    if (err) {
      // Migration ainda não aplicada: a tela segue funcionando, sem orçamentos
      setError(err.message);
    } else {
      setError(null);
      setBudgets((data as CategoryBudget[]) || []);
    }
    setLoading(false);
  }, [user, isDemoMode]);

  useEffect(() => {
    fetchBudgets();
  }, [fetchBudgets]);

  const setBudget = async (categoryId: string, monthlyLimit: number) => {
    if (isDemoMode) {
      setBudgets((prev) => [
        ...prev.filter((b) => b.category_id !== categoryId),
        {
          id: `demo-budget-${categoryId}`,
          user_id: 'demo-user-id-00000000',
          category_id: categoryId,
          monthly_limit: monthlyLimit,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]);
      return { error: null };
    }
    if (!user) return { error: new Error('Usuário não autenticado') };

    const { error: err } = await supabase
      .from('category_budgets')
      .upsert(
        { user_id: user.id, category_id: categoryId, monthly_limit: monthlyLimit },
        { onConflict: 'user_id,category_id' }
      );

    if (!err) await fetchBudgets();
    return { error: err ? new Error(err.message) : null };
  };

  const removeBudget = async (categoryId: string) => {
    if (isDemoMode) {
      setBudgets((prev) => prev.filter((b) => b.category_id !== categoryId));
      return { error: null };
    }
    if (!user) return { error: new Error('Usuário não autenticado') };

    const { error: err } = await supabase
      .from('category_budgets')
      .delete()
      .eq('user_id', user.id)
      .eq('category_id', categoryId);

    if (!err) setBudgets((prev) => prev.filter((b) => b.category_id !== categoryId));
    return { error: err ? new Error(err.message) : null };
  };

  return { budgets, loading, error, setBudget, removeBudget, refetch: fetchBudgets };
}
