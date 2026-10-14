/**
 * Regras de contas a pagar/receber: status por vencimento, ocorrências de contas fixas
 * mensais e decisão de quando lembrar o usuário. Funções puras sobre datas YYYY-MM-DD.
 */

export type BillStatus = 'paid' | 'due_today' | 'overdue' | 'upcoming';
export type ReminderKind = 'before' | 'today' | 'overdue';

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function toIso(year: number, month: number, day: number): string {
  const clamped = Math.min(day, daysInMonth(year, month));
  return `${year}-${String(month).padStart(2, '0')}-${String(clamped).padStart(2, '0')}`;
}

/** Diferença em dias (b - a) entre duas datas YYYY-MM-DD. */
export function diffInDays(a: string, b: string): number {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86_400_000);
}

/**
 * Status de uma conta: pago = verde, vence hoje = amarelo, atrasado = vermelho.
 */
export function getBillStatus(dueDate: string, isPaid: boolean, today: string): BillStatus {
  if (isPaid) return 'paid';
  if (dueDate === today) return 'due_today';
  if (dueDate < today) return 'overdue';
  return 'upcoming';
}

export interface RecurringBillLike {
  day_of_month: number;
  start_date: string;
  end_date: string | null;
  active: boolean;
}

/**
 * Datas de vencimento de uma conta fixa do mês de `today` até `monthsAhead` meses depois,
 * respeitando início/fim e ajustando o dia para o fim do mês quando necessário.
 */
export function buildRecurringOccurrences(bill: RecurringBillLike, today: string, monthsAhead = 1): string[] {
  if (!bill.active) return [];
  const [year, month] = today.split('-').map(Number);

  const dates: string[] = [];
  for (let i = 0; i <= monthsAhead; i++) {
    const index = year * 12 + (month - 1) + i;
    const y = Math.floor(index / 12);
    const m = (index % 12) + 1;
    const date = toIso(y, m, bill.day_of_month);

    if (date < bill.start_date) continue;
    if (bill.end_date && date > bill.end_date) continue;
    dates.push(date);
  }
  return dates;
}

/**
 * Decide se (e qual) lembrete deve ser enviado hoje para uma conta pendente:
 * - 'before': faltam exatamente `daysBefore` dias;
 * - 'today': vence hoje;
 * - 'overdue': já venceu.
 * Contas pagas nunca geram lembrete.
 */
export function getReminderKind(
  dueDate: string,
  isPaid: boolean,
  today: string,
  daysBefore: number
): ReminderKind | null {
  if (isPaid) return null;
  const remaining = diffInDays(today, dueDate);
  if (remaining < 0) return 'overdue';
  if (remaining === 0) return 'today';
  if (daysBefore > 0 && remaining === daysBefore) return 'before';
  return null;
}
