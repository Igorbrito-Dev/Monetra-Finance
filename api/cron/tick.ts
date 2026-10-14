import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../src/types/database';
import { getBrasiliaDateParts } from '../_lib/dates.js';
import { ensureRecurringOccurrences } from '../_lib/recurring.js';
import { sendTelegramMessage, escapeHtml } from '../_lib/telegram.js';
import { getReminderKind, diffInDays, type ReminderKind } from '../../src/lib/billRules.js';
import { formatIsoDateBR } from '../../src/lib/creditCardRules.js';

type Supabase = SupabaseClient<Database>;
type NotificationInsert = Database['public']['Tables']['notifications']['Insert'];

const OVERDUE_LOOKBACK_DAYS = 30;
const LOOKAHEAD_DAYS = 30;

function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function shiftDate(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

function whenLabel(kind: ReminderKind, dueDate: string, today: string): string {
  if (kind === 'today') return 'vence hoje';
  if (kind === 'overdue') {
    const days = Math.abs(diffInDays(today, dueDate));
    return `atrasada há ${days} dia${days === 1 ? '' : 's'} (venceu em ${formatIsoDateBR(dueDate)})`;
  }
  const days = diffInDays(today, dueDate);
  return days === 1 ? 'vence amanhã' : `vence em ${days} dias (${formatIsoDateBR(dueDate)})`;
}

/** Insere a notificação se ainda não existir (dedupe_key). Retorna true quando é nova. */
async function insertNotification(supabase: Supabase, row: NotificationInsert): Promise<boolean> {
  const { data, error } = await supabase
    .from('notifications')
    .upsert(row, { onConflict: 'user_id,dedupe_key', ignoreDuplicates: true })
    .select('id');
  if (error) {
    console.error('Erro ao criar notificação:', error.message);
    return false;
  }
  return (data?.length ?? 0) > 0;
}

/**
 * Tick horário (acionado pelo pg_cron do Supabase):
 * 1. gera ocorrências das contas fixas;
 * 2. cria lembretes de contas e de faturas de cartão;
 * 3. cria o relatório diário na hora configurada;
 * 4. entrega no Telegram o que ainda não foi enviado.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const cronSecret = process.env.CRON_SECRET;
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (!cronSecret || !supabaseUrl || !supabaseServiceKey) {
    return res.status(500).json({ error: 'Configuração incompleta no servidor' });
  }
  if (req.headers['x-cron-secret'] !== cronSecret) {
    return res.status(401).json({ error: 'Não autorizado' });
  }

  const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);
  const { dateStr: today, hour, monthFormatted, year } = getBrasiliaDateParts();

  const summary = { occurrencesCreated: 0, notificationsCreated: 0, telegramSent: 0 };

  try {
    summary.occurrencesCreated = await ensureRecurringOccurrences(supabase, null, today);

    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, telegram_chat_id, daily_report_enabled, daily_report_hour, bill_reminder_days, card_reminder_days');
    if (profilesError) throw profilesError;
    if (!profiles || profiles.length === 0) return res.status(200).json({ ok: true, ...summary });

    // Pendências próximas (e atrasadas recentes) de todos os usuários
    const { data: pending } = await supabase
      .from('transactions')
      .select('id, user_id, description, amount, type, due_date, transaction_date, credit_card_id')
      .eq('is_paid', false)
      .eq('is_invoice_payment', false)
      .in('type', ['expense', 'income'])
      .gte('transaction_date', shiftDate(today, -OVERDUE_LOOKBACK_DAYS))
      .lte('transaction_date', shiftDate(today, LOOKAHEAD_DAYS));

    const { data: cards } = await supabase.from('credit_cards').select('id, name');
    const cardNames = new Map((cards || []).map((c) => [c.id, c.name]));

    for (const profile of profiles) {
      const userPending = (pending || []).filter((t) => t.user_id === profile.id);
      const notifications: NotificationInsert[] = [];

      // --- Faturas de cartão: soma por cartão + vencimento ---
      const invoices = new Map<string, { cardId: string; dueDate: string; total: number; count: number }>();
      for (const t of userPending) {
        if (!t.credit_card_id || t.type !== 'expense') continue;
        const dueDate = t.due_date ?? t.transaction_date;
        const key = `${t.credit_card_id}|${dueDate}`;
        const entry = invoices.get(key) ?? { cardId: t.credit_card_id, dueDate, total: 0, count: 0 };
        entry.total += Number(t.amount);
        entry.count += 1;
        invoices.set(key, entry);
      }

      for (const invoice of invoices.values()) {
        const kind = getReminderKind(invoice.dueDate, false, today, profile.card_reminder_days);
        if (!kind) continue;
        const cardName = cardNames.get(invoice.cardId) ?? 'cartão';
        notifications.push({
          user_id: profile.id,
          type: 'card_invoice',
          title: `💳 Fatura do ${cardName}`,
          body: `A fatura de R$ ${formatBRL(invoice.total)} (${invoice.count} lançamento${invoice.count === 1 ? '' : 's'}) ${whenLabel(kind, invoice.dueDate, today)}.`,
          link_tab: 'cards',
          dedupe_key: `card:${invoice.cardId}:${invoice.dueDate}:${kind}`,
        });
      }

      // --- Contas a pagar/receber (fora do cartão) ---
      for (const t of userPending) {
        if (t.credit_card_id) continue;
        const dueDate = t.due_date ?? t.transaction_date;
        const kind = getReminderKind(dueDate, false, today, profile.bill_reminder_days);
        if (!kind) continue;

        const isIncome = t.type === 'income';
        const emoji = kind === 'overdue' ? '🚨' : kind === 'today' ? '📅' : '⏰';
        notifications.push({
          user_id: profile.id,
          type: kind === 'overdue' ? 'bill_overdue' : kind === 'today' ? 'bill_today' : 'bill_due',
          title: `${emoji} ${isIncome ? 'Recebimento' : 'Conta'}: ${t.description}`,
          body: `R$ ${formatBRL(Number(t.amount))} — ${whenLabel(kind, dueDate, today)}.`,
          link_tab: 'bills',
          dedupe_key: `bill:${t.id}:${dueDate}:${kind}`,
        });
      }

      // --- Relatório diário ---
      if (profile.daily_report_enabled && profile.daily_report_hour === hour) {
        const monthStart = `${year}-${monthFormatted}-01`;
        const { data: monthTx } = await supabase
          .from('transactions')
          .select('amount, type, transaction_date, is_invoice_payment')
          .eq('user_id', profile.id)
          .gte('transaction_date', monthStart)
          .lte('transaction_date', today);

        let spentToday = 0;
        let earnedToday = 0;
        let spentMonth = 0;
        let earnedMonth = 0;
        for (const t of monthTx || []) {
          if (t.is_invoice_payment) continue;
          const value = Number(t.amount);
          if (t.type === 'expense') {
            spentMonth += value;
            if (t.transaction_date === today) spentToday += value;
          } else if (t.type === 'income') {
            earnedMonth += value;
            if (t.transaction_date === today) earnedToday += value;
          }
        }

        const dueOf = (t: { due_date: string | null; transaction_date: string }) => t.due_date ?? t.transaction_date;
        const upcoming = userPending
          .filter((t) => t.type === 'expense' && dueOf(t) >= today && dueOf(t) <= shiftDate(today, 7))
          .sort((a, b) => dueOf(a).localeCompare(dueOf(b)))
          .slice(0, 5);
        const overdueCount = userPending.filter((t) => dueOf(t) < today).length;

        const lines = [
          `Gastos de hoje: R$ ${formatBRL(spentToday)}`,
          `Receitas de hoje: R$ ${formatBRL(earnedToday)}`,
          `Balanço do mês: R$ ${formatBRL(earnedMonth - spentMonth)} (receitas R$ ${formatBRL(earnedMonth)} − despesas R$ ${formatBRL(spentMonth)})`,
        ];
        if (overdueCount > 0) lines.push(`🚨 Contas atrasadas: ${overdueCount}`);
        if (upcoming.length > 0) {
          lines.push('Próximos 7 dias:');
          for (const t of upcoming) {
            lines.push(`• ${t.description} — R$ ${formatBRL(Number(t.amount))} (${formatIsoDateBR(dueOf(t))})`);
          }
        }

        notifications.push({
          user_id: profile.id,
          type: 'daily_report',
          title: `📊 Resumo do dia — ${formatIsoDateBR(today)}`,
          body: lines.join('\n'),
          link_tab: 'overview',
          dedupe_key: `report:${today}`,
        });
      }

      for (const notification of notifications) {
        if (await insertNotification(supabase, notification)) summary.notificationsCreated += 1;
      }
    }

    // --- Entrega no Telegram (inclui reenvio de falhas das últimas 24h) ---
    if (botToken) {
      const chatByUser = new Map<string, number>();
      for (const p of profiles) {
        if (p.telegram_chat_id) chatByUser.set(p.id, Number(p.telegram_chat_id));
      }

      if (chatByUser.size > 0) {
        const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
        const { data: unsent } = await supabase
          .from('notifications')
          .select('id, user_id, title, body')
          .is('telegram_sent_at', null)
          .gte('created_at', since)
          .in('user_id', Array.from(chatByUser.keys()))
          .order('created_at', { ascending: true })
          .limit(200);

        for (const n of unsent || []) {
          const chatId = chatByUser.get(n.user_id);
          if (!chatId) continue;
          const ok = await sendTelegramMessage(botToken, chatId, `<b>${escapeHtml(n.title)}</b>\n\n${escapeHtml(n.body)}`);
          if (ok) {
            await supabase.from('notifications').update({ telegram_sent_at: new Date().toISOString() }).eq('id', n.id);
            summary.telegramSent += 1;
          }
        }
      }
    }

    return res.status(200).json({ ok: true, ...summary });
  } catch (err) {
    console.error('Erro no tick de notificações:', err);
    return res.status(500).json({ ok: false, error: 'Falha ao processar o tick', ...summary });
  }
}
