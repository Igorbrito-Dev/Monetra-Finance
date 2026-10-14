import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

const HISTORY_LIMIT = 50;

const WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content:
    '👋 Olá! Sou o <b>Monetra Assistant</b>.\n\nMe conte seus gastos e receitas em linguagem natural, por exemplo:\n' +
    '• <i>comprei 2 carregadores em 5x de 40 no cartão</i>\n' +
    '• <i>gastei 30 no uber e 50 no mercado no pix</i>\n' +
    '• <i>aluguel de 1500 todo dia 5</i>',
};

/**
 * Chat com o agente financeiro dentro do app (mesma memória/regras do Telegram, canal "web").
 */
export function useAgentChat() {
  const { user, isDemoMode } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    if (isDemoMode || !user) {
      setLoading(false);
      return;
    }

    try {
      const { data, error: err } = await supabase
        .from('agent_messages')
        .select('id, role, content')
        .eq('user_id', user.id)
        .eq('channel', 'web')
        .order('created_at', { ascending: false })
        .limit(HISTORY_LIMIT);

      if (err) throw err;
      const history = (data || []).slice().reverse() as ChatMessage[];
      setMessages(history.length > 0 ? history : [WELCOME_MESSAGE]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar histórico');
    } finally {
      setLoading(false);
    }
  }, [user, isDemoMode]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const callAgent = async (text: string): Promise<string> => {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) throw new Error('Sessão expirada. Entre novamente.');

    const response = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ message: text }),
    });

    const payload = (await response.json().catch(() => ({}))) as { reply?: string; error?: string };
    if (!response.ok || !payload.reply) {
      throw new Error(payload.error || 'Não foi possível falar com o assistente');
    }
    return payload.reply;
  };

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    setError(null);
    const userMessage: ChatMessage = { id: `local-user-${Date.now()}`, role: 'user', content: trimmed };
    setMessages((prev) => [...prev.filter((m) => m.id !== 'welcome'), userMessage]);

    if (isDemoMode) {
      setMessages((prev) => [
        ...prev,
        {
          id: `local-assistant-${Date.now()}`,
          role: 'assistant',
          content: '🧪 O assistente funciona apenas com uma conta real conectada ao Supabase. Saia do modo demonstração para usá-lo.',
        },
      ]);
      return;
    }

    setSending(true);
    try {
      const reply = await callAgent(trimmed);
      setMessages((prev) => [...prev, { id: `local-assistant-${Date.now()}`, role: 'assistant', content: reply }]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar mensagem');
    } finally {
      setSending(false);
    }
  };

  /** Reinicia o contexto da conversa (apaga a memória do canal web). */
  const resetConversation = async () => {
    if (isDemoMode) {
      setMessages([WELCOME_MESSAGE]);
      return;
    }
    setSending(true);
    setError(null);
    try {
      await callAgent('/limpar');
      setMessages([WELCOME_MESSAGE]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao reiniciar conversa');
    } finally {
      setSending(false);
    }
  };

  return { messages, loading, sending, error, sendMessage, resetConversation };
}
