import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../src/types/database';
import { runFinanceAgent } from '../ai/agent.js';
import {
  isUpdateAlreadyProcessed,
  resolveUserIdByChatId,
  linkTelegramAccount,
  extractLinkToken,
} from './auth.js';
import { sendTelegramMessage } from '../_lib/telegram.js';
import {
  downloadTelegramVoiceBuffer,
  transcribeAudioWithWhisper,
} from '../ai/whisper.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Apenas aceita requisições POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // 1. Validação do Segredo do Webhook
  if (webhookSecret) {
    const incomingSecret = req.headers['x-telegram-bot-api-secret-token'];
    if (incomingSecret !== webhookSecret) {
      console.warn('Acesso ao webhook rejeitado: Secret token inválido.');
      return res.status(401).json({ error: 'Não autorizado' });
    }
  }

  if (!botToken || !supabaseUrl || !supabaseServiceKey) {
    console.error('Variáveis de ambiente ausentes no backend serverless.');
    return res.status(500).json({ error: 'Configuração incompleta no servidor' });
  }

  // Inicializa o cliente com chave de serviço (acesso seguro no serverless)
  const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceKey);

  const update = req.body;
  if (!update || !update.update_id) {
    return res.status(200).json({ ok: true, message: 'Update vazio ignorado' });
  }

  // 2. Proteção contra duplicação (Idempotência)
  const alreadyProcessed = await isUpdateAlreadyProcessed(supabaseAdmin, update.update_id);
  if (alreadyProcessed) {
    return res.status(200).json({ ok: true, message: 'Update já processado anteriormente' });
  }

  const message = update.message;
  if (!message) {
    return res.status(200).json({ ok: true, message: 'Update sem mensagem' });
  }

  const chatId = message.chat.id;
  let text = message.text ? message.text.trim() : '';
  let isVoice = false;

  // 3. Suporte a Mensagens de Áudio / Voz via OpenAI Whisper
  const voiceOrAudio = message.voice || message.audio;
  if (voiceOrAudio && voiceOrAudio.file_id) {
    try {
      const { buffer, filename } = await downloadTelegramVoiceBuffer(botToken, voiceOrAudio.file_id);
      text = await transcribeAudioWithWhisper(buffer, filename);
      isVoice = true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha na transcrição';
      console.error('Erro ao transcrever áudio com Whisper:', err);
      await sendTelegramMessage(
        botToken,
        chatId,
        `⚠️ <b>Não foi possível transcrever seu áudio:</b> ${msg}.\nPor favor, tente enviar por texto ou gravar novamente.`
      );
      return res.status(200).json({ ok: true });
    }
  }

  if (!text) {
    return res.status(200).json({ ok: true, message: 'Mensagem sem conteúdo legível' });
  }

  // 4. Reconhecimento de Código de Vinculação (6 dígitos, /start ou /vincular)
  const detectedToken = extractLinkToken(text);
  if (detectedToken) {
    const linkResult = await linkTelegramAccount(supabaseAdmin, chatId, detectedToken);
    await sendTelegramMessage(botToken, chatId, linkResult.message);
    return res.status(200).json({ ok: true });
  }

  // 5. Verificação de Usuário Vinculado
  const userId = await resolveUserIdByChatId(supabaseAdmin, chatId);

  if (!userId) {
    const welcomeMsg = `👋 Olá! Bem-vindo ao <b>Monetra Finance</b>.\n\nSua conta do Telegram ainda não está vinculada a nenhum usuário no sistema.\n\n<b>Como vincular rapidamente:</b>\n1. Acesse seu painel web do Monetra Finance;\n2. Clique no ícone do Telegram na barra superior e visualize seu código de 6 dígitos (ou clique em 'Abrir no Telegram');\n3. Envie apenas o código de 6 dígitos aqui nesta conversa (ex: <code>839201</code>).`;
    await sendTelegramMessage(botToken, chatId, welcomeMsg);
    return res.status(200).json({ ok: true });
  }


  // 6. Orquestração do Agente LangChain com OpenAI
  try {
    const agentResponse = await runFinanceAgent(userId, text, supabaseAdmin, 'telegram');
    await sendTelegramMessage(botToken, chatId, agentResponse);
  } catch (err: unknown) {
    console.error('Erro na execução do agente:', err);
    await sendTelegramMessage(
      botToken,
      chatId,
      'Desculpe, ocorreu uma instabilidade temporária ao consultar a inteligência artificial. Tente novamente em instantes.'
    );
  }

  return res.status(200).json({ ok: true });
}
