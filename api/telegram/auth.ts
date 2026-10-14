import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../src/types/database';

/**
 * Gera um código numérico de 6 dígitos puramente numéricos (ex: 839201)
 */
export function generateNumericLinkCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Extrai o código de vinculação da mensagem do Telegram:
 * - Se for "/start 123456" ou "/vincular 123456" -> retorna "123456"
 * - Se for apenas "123456" (6 dígitos numéricos) -> retorna "123456"
 * - Se for formato legado "MT1234" -> retorna "MT1234"
 */
export function extractLinkToken(text: string): string | null {
  if (!text) return null;
  const clean = text.trim();

  // Caso 1: Apenas os 6 dígitos numéricos digitados diretamente
  if (/^\d{6}$/.test(clean)) {
    return clean;
  }

  // Caso 2: Comando /start ou /vincular com argumento
  if (clean.startsWith('/start') || clean.startsWith('/vincular')) {
    const parts = clean.split(/\s+/);
    if (parts.length > 1 && parts[1].trim()) {
      return parts[1].trim();
    }
  }

  // Caso 3: Formato com prefixo MT ou token alfanumérico avulso (ex: MT8291)
  if (/^MT[A-Z0-9]{4,8}$/i.test(clean)) {
    return clean.toUpperCase();
  }

  return null;
}

/**
 * Verifica idempotência do webhook para evitar reprocessamento de mensagens repetidas do Telegram
 */
export async function isUpdateAlreadyProcessed(
  supabase: SupabaseClient<Database>,
  updateId: number
): Promise<boolean> {
  try {
    const { data } = await supabase
      .from('telegram_updates')
      .select('update_id')
      .eq('update_id', updateId)
      .maybeSingle();

    if (data) {
      return true; // Já processado
    }

    // Registra o update_id
    await supabase.from('telegram_updates').insert({
      update_id: updateId,
    });

    return false;
  } catch (err) {
    console.error('Erro ao verificar idempotência:', err);
    return false;
  }
}

/**
 * Busca o user_id correspondente ao telegram_chat_id
 */
export async function resolveUserIdByChatId(
  supabase: SupabaseClient<Database>,
  chatId: number
): Promise<string | null> {
  try {
    const { data } = await supabase
      .from('profiles')
      .select('id')
      .eq('telegram_chat_id', chatId)
      .maybeSingle();

    return data ? data.id : null;
  } catch (err) {
    console.error('Erro ao resolver chat_id:', err);
    return null;
  }
}

/**
 * Pareia a conta do Telegram utilizando um token efêmero gerado na interface web
 */
export async function linkTelegramAccount(
  supabase: SupabaseClient<Database>,
  chatId: number,
  tokenInput: string
): Promise<{ success: boolean; message: string }> {
  const cleanToken = tokenInput.trim();

  if (!cleanToken) {
    return {
      success: false,
      message: 'Token de vinculação não informado. Gere um código no painel web do Monetra Finance.',
    };
  }

  try {
    // 1. Busca o token válido na tabela telegram_link_tokens
    const now = new Date().toISOString();
    const { data: linkRecord, error: searchError } = await supabase
      .from('telegram_link_tokens')
      .select('id, user_id, expires_at')
      .eq('token', cleanToken)
      .gt('expires_at', now)
      .maybeSingle();

    if (searchError || !linkRecord) {
      return {
        success: false,
        message: '❌ Código de vinculação inválido ou expirado. Por favor, acesse o painel web e gere um novo código de 6 dígitos.',
      };
    }

    const userId = linkRecord.user_id;

    // 2. Atualiza o perfil do usuário associando o telegram_chat_id
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ telegram_chat_id: chatId })
      .eq('id', userId);

    if (updateError) {
      return {
        success: false,
        message: `❌ Erro ao vincular sua conta: ${updateError.message}`,
      };
    }

    // 3. Remove o token utilizado (uso único)
    await supabase.from('telegram_link_tokens').delete().eq('id', linkRecord.id);

    return {
      success: true,
      message: '🎉 <b>Conta vinculada com sucesso ao Monetra Finance!</b>\n\nAgora você tem controle financeiro total pelo Telegram via <b>texto</b> ou <b>áudio (voz)</b>:\n\n• 🎙️ <i>Mande um áudio dizendo: "Gastei R$ 45 no almoço no débito"</i>\n• 💬 <i>"Recebi R$ 3.000 de salário no pix"</i>\n• 📊 <i>"Quanto gastei na fatura deste mês?"</i>\n• 📅 <i>"Quanto tenho de parcelas para o mês que vem?"</i>\n• 🎯 <i>"Qual é meu teto de gastos e quanto ainda posso gastar?"</i>',
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro interno';
    return {
      success: false,
      message: `Erro ao processar vinculação: ${msg}`,
    };
  }
}
