import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../src/types/database';
import { runFinanceAgent } from './agent.js';

const MAX_MESSAGE_LENGTH = 1000;

/**
 * Chat do app web com o mesmo agente do Telegram.
 * A identidade vem do JWT do Supabase (nunca do corpo da requisição).
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    return res.status(500).json({ error: 'Configuração incompleta no servidor' });
  }

  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!token) {
    return res.status(401).json({ error: 'Não autenticado' });
  }

  const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceKey);
  const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !authData.user) {
    return res.status(401).json({ error: 'Sessão inválida' });
  }

  const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
  if (!message) {
    return res.status(400).json({ error: 'Mensagem vazia' });
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    return res.status(400).json({ error: `Mensagem muito longa (máximo ${MAX_MESSAGE_LENGTH} caracteres)` });
  }

  try {
    const reply = await runFinanceAgent(authData.user.id, message, supabaseAdmin, 'web');
    return res.status(200).json({ reply });
  } catch (err) {
    console.error('Erro no chat do agente:', err);
    return res.status(500).json({ error: 'Falha ao processar a mensagem' });
  }
}
