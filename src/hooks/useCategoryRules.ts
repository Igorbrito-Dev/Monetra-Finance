import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { ruleKeyFromDescription, type CategoryRule } from '../lib/categoryRules';

/**
 * Regras de categorização aprendidas com as correções do usuário.
 * Se a tabela ainda não existir (migration pendente), o app segue sem aprendizado.
 */
export function useCategoryRules() {
  const { user, isDemoMode } = useAuth();
  const [rules, setRules] = useState<CategoryRule[]>([]);

  const fetchRules = useCallback(async () => {
    if (isDemoMode || !user) {
      setRules([]);
      return;
    }
    const { data, error } = await supabase
      .from('category_rules')
      .select('keyword, category_id')
      .eq('user_id', user.id);

    if (!error && data) setRules(data as CategoryRule[]);
  }, [user, isDemoMode]);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  /** Memoriza que descrições parecidas com esta pertencem à categoria escolhida. */
  const learn = async (description: string, categoryId: string | null) => {
    if (!user || isDemoMode || !categoryId) return;
    const keyword = ruleKeyFromDescription(description);
    if (!keyword) return;

    const { error } = await supabase
      .from('category_rules')
      .upsert(
        { user_id: user.id, keyword, category_id: categoryId },
        { onConflict: 'user_id,keyword' }
      );

    if (!error) {
      setRules((prev) => [...prev.filter((r) => r.keyword !== keyword), { keyword, category_id: categoryId }]);
    }
  };

  return { rules, learn, refetch: fetchRules };
}
