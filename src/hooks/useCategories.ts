import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Category } from '../types/database';

export const DEFAULT_BRAZILIAN_CATEGORIES: Omit<Category, 'id' | 'user_id' | 'created_at' | 'updated_at'>[] = [
  // Despesas
  { name: 'Alimentação & Supermercado', type: 'expense', color: '#EF4444', icon: 'utensils', parent_id: null, is_active: true },
  { name: 'Moradia & Contas', type: 'expense', color: '#F97316', icon: 'home', parent_id: null, is_active: true },
  { name: 'Transporte & Combustível', type: 'expense', color: '#F59E0B', icon: 'car', parent_id: null, is_active: true },
  { name: 'Saúde & Farmácia', type: 'expense', color: '#10B981', icon: 'heart-pulse', parent_id: null, is_active: true },
  { name: 'Lazer & Entretenimento', type: 'expense', color: '#8B5CF6', icon: 'gamepad-2', parent_id: null, is_active: true },
  { name: 'Educação & Cursos', type: 'expense', color: '#3B82F6', icon: 'graduation-cap', parent_id: null, is_active: true },
  { name: 'Assinaturas & Serviços', type: 'expense', color: '#EC4899', icon: 'tv', parent_id: null, is_active: true },
  { name: 'Vestuário & Compras', type: 'expense', color: '#6366F1', icon: 'shopping-bag', parent_id: null, is_active: true },
  
  // Receitas
  { name: 'Salário Principal', type: 'income', color: '#10B981', icon: 'banknote', parent_id: null, is_active: true },
  { name: 'Freelance & Projetos', type: 'income', color: '#06B6D4', icon: 'briefcase', parent_id: null, is_active: true },
  { name: 'Rendimentos & Dividendos', type: 'income', color: '#8B5CF6', icon: 'trending-up', parent_id: null, is_active: true },
  { name: 'Outras Entradas', type: 'income', color: '#64748B', icon: 'plus-circle', parent_id: null, is_active: true },
];

const DEFAULT_CATEGORIES: { name: string; type: 'income' | 'expense'; color: string; icon: string }[] = [
  { name: 'Alimentação', type: 'expense', color: '#F97316', icon: 'utensils' },
  { name: 'Transporte', type: 'expense', color: '#3B82F6', icon: 'car' },
  { name: 'Moradia', type: 'expense', color: '#8B5CF6', icon: 'home' },
  { name: 'Saúde', type: 'expense', color: '#EF4444', icon: 'heart' },
  { name: 'Lazer', type: 'expense', color: '#EC4899', icon: 'smile' },
  { name: 'Educação', type: 'expense', color: '#0EA5E9', icon: 'book' },
  { name: 'Compras', type: 'expense', color: '#F59E0B', icon: 'shopping-bag' },
  { name: 'Assinaturas', type: 'expense', color: '#6366F1', icon: 'repeat' },
  { name: 'Outros', type: 'expense', color: '#64748B', icon: 'tag' },
  { name: 'Salário', type: 'income', color: '#10B981', icon: 'briefcase' },
  { name: 'Freelance', type: 'income', color: '#14B8A6', icon: 'laptop' },
  { name: 'Rendimentos', type: 'income', color: '#22C55E', icon: 'trending-up' },
  { name: 'Outras receitas', type: 'income', color: '#84CC16', icon: 'tag' },
];

const seededKey = (userId: string) => `monetra:defaults-seeded:${userId}`;

function hasSeededDefaults(userId: string): boolean {
  try {
    return localStorage.getItem(seededKey(userId)) === '1';
  } catch {
    return true; // sem armazenamento disponível: não semeia para evitar duplicar
  }
}

function markSeededDefaults(userId: string): void {
  try {
    localStorage.setItem(seededKey(userId), '1');
  } catch {
    /* ignora */
  }
}

export function useCategories() {
  const { user, isDemoMode } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    if (isDemoMode) {
      const mockCategories: Category[] = DEFAULT_BRAZILIAN_CATEGORIES.map((cat, idx) => ({
        ...cat,
        id: `demo-cat-${idx + 1}`,
        user_id: user?.id || 'demo-user',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));
      setCategories(mockCategories);
      setLoading(false);
      return;
    }

    if (!user) {
      setCategories([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const { data, error: err } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', user.id)
        .order('type', { ascending: false })
        .order('name', { ascending: true });

      if (err) throw err;
      let rows = (data as Category[]) || [];

      // Primeiro acesso: cria um conjunto padrão (uma única vez por navegador) para a
      // sugestão automática de categorias funcionar desde o início.
      if (rows.length === 0 && !hasSeededDefaults(user.id)) {
        markSeededDefaults(user.id);
        const { data: seeded, error: seedError } = await supabase
          .from('categories')
          .insert(DEFAULT_CATEGORIES.map((c) => ({ ...c, user_id: user.id })))
          .select();
        if (!seedError && seeded) {
          rows = (seeded as Category[]).sort((a, b) => a.name.localeCompare(b.name));
        }
      }

      setCategories(rows);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao buscar categorias';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [user, isDemoMode]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const createCategory = async (categoryData: {
    name: string;
    type: 'income' | 'expense';
    color?: string;
    icon?: string;
  }) => {
    if (isDemoMode) {
      const newCat: Category = {
        id: `demo-cat-${Date.now()}`,
        user_id: user?.id || 'demo-user',
        name: categoryData.name,
        type: categoryData.type,
        color: categoryData.color || (categoryData.type === 'income' ? '#10B981' : '#EF4444'),
        icon: categoryData.icon || 'tag',
        parent_id: null,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setCategories((prev) => [newCat, ...prev]);
      return { data: newCat, error: null };
    }

    if (!user) return { data: null, error: new Error('Usuário não autenticado') };

    const { data, error: err } = await supabase
      .from('categories')
      .insert({
        user_id: user.id,
        name: categoryData.name,
        type: categoryData.type,
        color: categoryData.color || (categoryData.type === 'income' ? '#10B981' : '#EF4444'),
        icon: categoryData.icon || 'tag',
      })
      .select()
      .single();

    if (!err && data) {
      setCategories((prev) => [data as Category, ...prev]);
    }
    return { data, error: err };
  };

  const seedDefaultCategories = async () => {
    if (isDemoMode) {
      fetchCategories();
      return { error: null };
    }

    if (!user) return { error: new Error('Usuário não autenticado') };

    const categoriesToInsert = DEFAULT_BRAZILIAN_CATEGORIES.map((cat) => ({
      ...cat,
      user_id: user.id,
    }));

    const { data, error: err } = await supabase
      .from('categories')
      .insert(categoriesToInsert)
      .select();

    if (!err && data) {
      setCategories(data as Category[]);
    }
    return { error: err };
  };

  const deleteCategory = async (id: string) => {
    if (isDemoMode) {
      setCategories((prev) => prev.filter((c) => c.id !== id));
      return { error: null };
    }

    const { error: err } = await supabase.from('categories').delete().eq('id', id);
    if (!err) {
      setCategories((prev) => prev.filter((c) => c.id !== id));
    }
    return { error: err };
  };

  return {
    categories,
    loading,
    error,
    refetch: fetchCategories,
    createCategory,
    deleteCategory,
    seedDefaultCategories,
  };
}
