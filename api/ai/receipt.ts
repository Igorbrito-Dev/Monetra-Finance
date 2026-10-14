import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage } from '@langchain/core/messages';
import { z } from 'zod';
import type { Database } from '../../src/types/database';

/** Limite diário de leituras por usuário (controle de custo da IA). */
const DAILY_LIMIT = 15;
/** ~4 MB em base64 (a Vercel limita o corpo da requisição a ~4,5 MB). */
const MAX_BASE64_LENGTH = 4_000_000;

const ReceiptSchema = z.object({
  description: z.string().describe('Nome do estabelecimento ou descrição curta da compra'),
  amount: z.number().nullable().describe('Valor total pago em reais, ou null se ilegível'),
  date: z.string().nullable().describe('Data da compra no formato YYYY-MM-DD, ou null'),
  categoryName: z
    .string()
    .nullable()
    .describe('Uma destas categorias: Alimentação, Transporte, Moradia, Saúde, Lazer, Educação, Compras, Assinaturas, Outros'),
});

/**
 * Lê uma foto de nota fiscal/comprovante e devolve os campos para o usuário confirmar.
 * Nada é gravado aqui: o app preenche o formulário e o usuário confirma o lançamento.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!supabaseUrl || !supabaseServiceKey || !openaiKey) {
    return res.status(500).json({ error: 'Configuração incompleta no servidor' });
  }

  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!token) {
    return res.status(401).json({ error: 'Não autenticado' });
  }

  const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);
  const { data: authData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !authData.user) {
    return res.status(401).json({ error: 'Sessão inválida' });
  }
  const userId = authData.user.id;

  const imageBase64 = typeof req.body?.imageBase64 === 'string' ? req.body.imageBase64 : '';
  const mimeType = req.body?.mimeType === 'image/png' ? 'image/png' : 'image/jpeg';
  if (!imageBase64 || imageBase64.length > MAX_BASE64_LENGTH || !/^[A-Za-z0-9+/=]+$/.test(imageBase64.slice(0, 200))) {
    return res.status(400).json({ error: 'Imagem inválida ou grande demais.' });
  }

  // Limite diário por usuário
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { count, error: countError } = await supabase
    .from('ai_usage')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('kind', 'receipt')
    .gte('created_at', since);

  if (countError) {
    return res.status(500).json({ error: 'Não foi possível verificar seu limite de uso.' });
  }
  if ((count ?? 0) >= DAILY_LIMIT) {
    return res.status(429).json({ error: `Limite de ${DAILY_LIMIT} leituras de comprovante por dia atingido.` });
  }

  try {
    const model = new ChatOpenAI({ modelName: 'gpt-4o-mini', temperature: 0, openAIApiKey: openaiKey });
    const structured = model.withStructuredOutput(ReceiptSchema);

    const result = await structured.invoke([
      new HumanMessage({
        content: [
          {
            type: 'text',
            text:
              'Leia este comprovante ou nota fiscal brasileira e extraia o estabelecimento, o valor total pago, ' +
              'a data da compra e a categoria mais adequada. Se um campo não estiver legível, use null.',
          },
          { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
        ],
      }),
    ]);

    await supabase.from('ai_usage').insert({ user_id: userId, kind: 'receipt' });

    return res.status(200).json({
      description: result.description,
      amount: result.amount,
      date: result.date,
      categoryName: result.categoryName,
    });
  } catch (err) {
    console.error('Erro ao ler comprovante:', err);
    return res.status(500).json({ error: 'Não foi possível ler o comprovante. Tente outra foto.' });
  }
}
