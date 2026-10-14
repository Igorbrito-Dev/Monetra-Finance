import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export function useTelegramIntegration() {
  const { user, profile, refreshProfile, isDemoMode } = useAuth();
  const [token, setToken] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isLinked = Boolean(profile?.telegram_chat_id);

  const generateLinkToken = async () => {
    setLoading(true);
    setError(null);

    // Gera um código de 6 dígitos puramente numéricos (ex: 839201)
    const randomCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiration = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos

    if (isDemoMode) {
      setToken(randomCode);
      setExpiresAt(expiration);
      setLoading(false);
      return { token: randomCode, error: null };
    }

    if (!user) {
      setLoading(false);
      return { token: null, error: new Error('Usuário não autenticado') };
    }

    try {
      // Remove tokens antigos do usuário
      await supabase.from('telegram_link_tokens').delete().eq('user_id', user.id);

      // Insere novo token
      const { data, error: insertError } = await supabase
        .from('telegram_link_tokens')
        .insert({
          user_id: user.id,
          token: randomCode,
          expires_at: expiration.toISOString(),
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setToken(data.token);
      setExpiresAt(new Date(data.expires_at));
      return { token: data.token, error: null };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao gerar código';
      setError(msg);
      return { token: null, error: err };
    } finally {
      setLoading(false);
    }
  };

  const unlinkTelegram = async () => {
    setLoading(true);
    setError(null);

    if (isDemoMode) {
      setToken(null);
      setLoading(false);
      return { error: null };
    }

    if (!user) return { error: new Error('Usuário não autenticado') };

    try {
      const { error: err } = await supabase
        .from('profiles')
        .update({ telegram_chat_id: null })
        .eq('id', user.id);

      if (err) throw err;

      await refreshProfile();
      setToken(null);
      return { error: null };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao desvincular';
      setError(msg);
      return { error: err };
    } finally {
      setLoading(false);
    }
  };

  return {
    isLinked,
    chatId: profile?.telegram_chat_id ?? null,
    token,
    expiresAt,
    loading,
    error,
    generateLinkToken,
    unlinkTelegram,
  };
}
