import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { CreditCard } from '../types/database';

const INITIAL_DEMO_CARDS: CreditCard[] = [
  {
    id: 'demo-card-1',
    user_id: 'demo-user-id-00000000',
    name: 'Nubank Ultravioleta Mastercard',
    limit_amount: 15000.0,
    closing_day: 22,
    due_day: 29,
    color: '#820AD1',
    icon: 'credit-card',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'demo-card-2',
    user_id: 'demo-user-id-00000000',
    name: 'Itaú Visa Infinite',
    limit_amount: 30000.0,
    closing_day: 5,
    due_day: 12,
    color: '#0F172A',
    icon: 'credit-card',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export function useCreditCards() {
  const { user, isDemoMode } = useAuth();
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCards = useCallback(async () => {
    if (isDemoMode) {
      setCards(INITIAL_DEMO_CARDS);
      setLoading(false);
      return;
    }

    if (!user) {
      setCards([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const { data, error: err } = await supabase
        .from('credit_cards')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (err) throw err;
      setCards((data as CreditCard[]) || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao buscar cartões';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [user, isDemoMode]);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  const createCard = async (cardData: {
    name: string;
    limit_amount: number;
    closing_day: number;
    due_day: number;
    color?: string;
  }) => {
    if (isDemoMode) {
      const newCard: CreditCard = {
        id: `demo-card-${Date.now()}`,
        user_id: user?.id || 'demo-user',
        name: cardData.name,
        limit_amount: cardData.limit_amount,
        closing_day: cardData.closing_day,
        due_day: cardData.due_day,
        color: cardData.color || '#8B5CF6',
        icon: 'credit-card',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setCards((prev) => [newCard, ...prev]);
      return { data: newCard, error: null };
    }

    if (!user) return { data: null, error: new Error('Usuário não autenticado') };

    const { data, error: err } = await supabase
      .from('credit_cards')
      .insert({
        user_id: user.id,
        name: cardData.name,
        limit_amount: cardData.limit_amount,
        closing_day: cardData.closing_day,
        due_day: cardData.due_day,
        color: cardData.color || '#8B5CF6',
      })
      .select()
      .single();

    if (!err && data) {
      setCards((prev) => [data as CreditCard, ...prev]);
    }
    return { data, error: err };
  };

  const deleteCard = async (id: string) => {
    if (isDemoMode) {
      setCards((prev) => prev.filter((c) => c.id !== id));
      return { error: null };
    }

    const { error: err } = await supabase.from('credit_cards').delete().eq('id', id);
    if (!err) {
      setCards((prev) => prev.filter((c) => c.id !== id));
    }
    return { error: err };
  };

  return {
    cards,
    loading,
    error,
    refetch: fetchCards,
    createCard,
    deleteCard,
  };
}
