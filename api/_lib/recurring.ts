import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../src/types/database';
import { buildRecurringOccurrences } from '../../src/lib/billRules.js';

/**
 * Garante que cada conta fixa ativa tenha a transação (ocorrência) do mês atual e do seguinte.
 * Idempotente: só insere as ocorrências que ainda não existem (índice único recurring_bill_id + due_date).
 *
 * @param userId  restringe a um usuário; `null` processa todos (uso do cron, com service_role)
 * @param today   data de hoje em Brasília (YYYY-MM-DD)
 * @returns quantidade de ocorrências criadas
 */
export async function ensureRecurringOccurrences(
  supabase: SupabaseClient<Database>,
  userId: string | null,
  today: string
): Promise<number> {
  let billsQuery = supabase.from('recurring_bills').select('*').eq('active', true);
  if (userId) billsQuery = billsQuery.eq('user_id', userId);

  const { data: bills, error } = await billsQuery;
  if (error || !bills || bills.length === 0) return 0;

  const wanted = bills.flatMap((bill) =>
    buildRecurringOccurrences(bill, today, 1).map((dueDate) => ({ bill, dueDate }))
  );
  if (wanted.length === 0) return 0;

  const dates = wanted.map((w) => w.dueDate).sort();
  const { data: existing } = await supabase
    .from('transactions')
    .select('recurring_bill_id, due_date')
    .in('recurring_bill_id', bills.map((b) => b.id))
    .gte('due_date', dates[0])
    .lte('due_date', dates[dates.length - 1]);

  const existingKeys = new Set((existing || []).map((t) => `${t.recurring_bill_id}|${t.due_date}`));

  const rows = wanted
    .filter((w) => !existingKeys.has(`${w.bill.id}|${w.dueDate}`))
    .map(({ bill, dueDate }) => ({
      user_id: bill.user_id,
      description: bill.description,
      amount: Number(bill.amount),
      type: bill.type,
      payment_method: bill.payment_method,
      transaction_date: dueDate,
      due_date: dueDate,
      is_paid: false,
      is_recurrent: true,
      recurring_bill_id: bill.id,
      account_id: bill.account_id,
      credit_card_id: bill.credit_card_id,
      category_id: bill.category_id,
      notes: bill.notes,
    }));

  if (rows.length === 0) return 0;

  const { error: insertError } = await supabase.from('transactions').insert(rows);
  if (!insertError) return rows.length;

  // Corrida com outra execução (violação do índice único): tenta uma a uma, ignorando duplicadas.
  let created = 0;
  for (const row of rows) {
    const { error: rowError } = await supabase.from('transactions').insert(row);
    if (!rowError) created += 1;
  }
  return created;
}
