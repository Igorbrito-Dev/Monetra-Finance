/**
 * Indicadores do dia a dia: quanto posso gastar hoje, previsão de fim de mês, comparativo
 * com o mês anterior, gasto atípico, assinaturas detectadas e sugestões de descrição.
 * Funções puras sobre datas YYYY-MM-DD, compartilhadas entre o app e o backend.
 */

export interface InsightTx {
  id?: string;
  description: string;
  amount: number | string;
  type: string;
  transaction_date: string;
  is_paid: boolean;
  is_invoice_payment: boolean;
  category_id: string | null;
  account_id?: string | null;
  credit_card_id?: string | null;
  payment_method?: string;
  installment_number?: number | null;
  recurring_bill_id?: string | null;
}

function toCents(value: number | string): number {
  return Math.round(Number(value) * 100);
}

export function normalizeDescription(value: string): string {
  return (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\(?\s*parc(?:ela)?\.?\s*\d+\s*(?:\/|de)\s*\d+\s*\)?/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function isConsumptionExpense(tx: InsightTx): boolean {
  return tx.type === 'expense' && !tx.is_invoice_payment;
}

export interface MonthOutlook {
  spentToDate: number;
  scheduledRemaining: number;
  variableAvgPerDay: number;
  projectedExpense: number;
  projectedIncome: number;
  projectedBalance: number;
  remainingDays: number;
  /** null quando não há teto mensal definido */
  dailyAllowance: number | null;
  budgetRemaining: number | null;
}

/**
 * Situação do mês corrente: gasto até hoje, compromissos já agendados, projeção até o fim do mês
 * e quanto ainda dá para gastar por dia dentro do teto.
 */
export function computeMonthOutlook(transactions: InsightTx[], today: string, monthlyBudget: number): MonthOutlook {
  const [year, month, day] = today.split('-').map(Number);
  const prefix = `${year}-${String(month).padStart(2, '0')}`;
  const totalDays = daysInMonth(year, month);

  let spentCents = 0;
  let variableCents = 0;
  let scheduledCents = 0;
  let incomeToDateCents = 0;
  let incomeScheduledCents = 0;

  for (const tx of transactions) {
    if (!tx.transaction_date.startsWith(prefix)) continue;
    const cents = toCents(tx.amount);
    const isPast = tx.transaction_date <= today;

    if (isConsumptionExpense(tx)) {
      if (isPast) {
        spentCents += cents;
        if (!tx.installment_number && !tx.recurring_bill_id) variableCents += cents;
      } else {
        scheduledCents += cents;
      }
    } else if (tx.type === 'income') {
      if (isPast) incomeToDateCents += cents;
      else incomeScheduledCents += cents;
    }
  }

  const avgPerDay = variableCents / 100 / Math.max(1, day);
  const daysLeftAfterToday = totalDays - day;
  const remainingDays = daysLeftAfterToday + 1;

  const projectedExpense = spentCents / 100 + scheduledCents / 100 + avgPerDay * daysLeftAfterToday;
  const projectedIncome = (incomeToDateCents + incomeScheduledCents) / 100;

  const budgetRemaining = monthlyBudget > 0 ? monthlyBudget - spentCents / 100 - scheduledCents / 100 : null;
  const dailyAllowance =
    budgetRemaining === null ? null : Math.max(0, Math.round((budgetRemaining / remainingDays) * 100) / 100);

  return {
    spentToDate: spentCents / 100,
    scheduledRemaining: scheduledCents / 100,
    variableAvgPerDay: Math.round(avgPerDay * 100) / 100,
    projectedExpense: Math.round(projectedExpense * 100) / 100,
    projectedIncome,
    projectedBalance: Math.round((projectedIncome - projectedExpense) * 100) / 100,
    remainingDays,
    dailyAllowance,
    budgetRemaining,
  };
}

export interface CategoryComparison {
  categoryId: string | null;
  current: number;
  previous: number;
  /** Variação percentual; null quando não havia gasto no período anterior */
  deltaPct: number | null;
}

/**
 * Compara o gasto por categoria do mês atual (até hoje) com o mesmo intervalo do mês anterior.
 */
export function compareCategoryMonths(transactions: InsightTx[], today: string): CategoryComparison[] {
  const [year, month, day] = today.split('-').map(Number);
  const currentPrefix = `${year}-${String(month).padStart(2, '0')}`;
  const prevIndex = year * 12 + (month - 1) - 1;
  const prevYear = Math.floor(prevIndex / 12);
  const prevMonth = (prevIndex % 12) + 1;
  const previousPrefix = `${prevYear}-${String(prevMonth).padStart(2, '0')}`;
  const cutoff = String(day).padStart(2, '0');

  const current = new Map<string | null, number>();
  const previous = new Map<string | null, number>();

  for (const tx of transactions) {
    if (!isConsumptionExpense(tx)) continue;
    const dayPart = tx.transaction_date.slice(8, 10);
    const cents = toCents(tx.amount);

    if (tx.transaction_date.startsWith(currentPrefix) && tx.transaction_date <= today) {
      current.set(tx.category_id, (current.get(tx.category_id) ?? 0) + cents);
    } else if (tx.transaction_date.startsWith(previousPrefix) && dayPart <= cutoff) {
      previous.set(tx.category_id, (previous.get(tx.category_id) ?? 0) + cents);
    }
  }

  const keys = new Set<string | null>([...current.keys(), ...previous.keys()]);
  const result: CategoryComparison[] = [];
  for (const key of keys) {
    const cur = (current.get(key) ?? 0) / 100;
    const prev = (previous.get(key) ?? 0) / 100;
    result.push({
      categoryId: key,
      current: cur,
      previous: prev,
      deltaPct: prev > 0 ? Math.round(((cur - prev) / prev) * 100) : null,
    });
  }
  return result.sort((a, b) => b.current - a.current);
}

/** Gasto por categoria no mês de `today` (inclui compromissos já agendados dentro do mês). */
export function categorySpendForMonth(transactions: InsightTx[], today: string): Map<string, number> {
  const prefix = today.slice(0, 7);
  const cents = new Map<string, number>();
  for (const tx of transactions) {
    if (!isConsumptionExpense(tx) || !tx.category_id || !tx.transaction_date.startsWith(prefix)) continue;
    cents.set(tx.category_id, (cents.get(tx.category_id) ?? 0) + toCents(tx.amount));
  }
  const result = new Map<string, number>();
  for (const [id, value] of cents) result.set(id, value / 100);
  return result;
}

export interface Anomaly {
  isAnomaly: boolean;
  ratio: number;
  median: number;
}

/**
 * Um gasto é atípico quando é pelo menos 3x a mediana do histórico da categoria
 * (com no mínimo 3 registros) e a diferença passa de R$ 50.
 */
export function detectAnomaly(amount: number, history: number[]): Anomaly {
  const sorted = history.filter((v) => v > 0).sort((a, b) => a - b);
  if (sorted.length < 3) return { isAnomaly: false, ratio: 0, median: 0 };

  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  const ratio = median > 0 ? amount / median : 0;
  return { isAnomaly: ratio >= 3 && amount - median >= 50, ratio: Math.round(ratio * 10) / 10, median };
}

export interface SubscriptionCandidate {
  description: string;
  amount: number;
  months: number;
  lastDate: string;
  categoryId: string | null;
}

/**
 * Detecta cobranças que se repetem: mesma descrição, valor parecido (±10%) em pelo menos
 * 3 meses diferentes, fora de parcelas e de contas fixas já cadastradas.
 */
export function detectSubscriptions(transactions: InsightTx[]): SubscriptionCandidate[] {
  const groups = new Map<string, InsightTx[]>();

  for (const tx of transactions) {
    if (!isConsumptionExpense(tx) || tx.installment_number || tx.recurring_bill_id) continue;
    const key = normalizeDescription(tx.description);
    if (key.length < 3) continue;
    groups.set(key, [...(groups.get(key) ?? []), tx]);
  }

  const result: SubscriptionCandidate[] = [];
  for (const items of groups.values()) {
    const amounts = items.map((t) => Number(t.amount)).sort((a, b) => a - b);
    const median = amounts[Math.floor(amounts.length / 2)];
    const similar = items.filter((t) => Math.abs(Number(t.amount) - median) <= median * 0.1);
    const months = new Set(similar.map((t) => t.transaction_date.slice(0, 7)));
    if (months.size < 3) continue;

    const latest = similar.reduce((a, b) => (a.transaction_date >= b.transaction_date ? a : b));
    result.push({
      description: latest.description,
      amount: median,
      months: months.size,
      lastDate: latest.transaction_date,
      categoryId: latest.category_id,
    });
  }

  return result.sort((a, b) => b.amount - a.amount);
}

export interface DescriptionSuggestion {
  description: string;
  categoryId: string | null;
  accountId: string | null;
  creditCardId: string | null;
  paymentMethod: string | null;
  lastAmount: number;
  uses: number;
}

/**
 * Sugestões de descrição a partir do histórico (mais usadas e mais recentes primeiro).
 * Ao escolher uma, o app reaproveita categoria, conta/cartão e forma de pagamento usados antes.
 */
export function buildDescriptionSuggestions(
  transactions: InsightTx[],
  query: string,
  limit = 5
): DescriptionSuggestion[] {
  const q = normalizeDescription(query);
  const groups = new Map<string, { latest: InsightTx; uses: number }>();

  for (const tx of transactions) {
    if (tx.type !== 'expense' && tx.type !== 'income') continue;
    if (tx.is_invoice_payment || tx.installment_number) continue;
    const key = normalizeDescription(tx.description);
    if (!key) continue;
    if (q && !key.includes(q)) continue;

    const entry = groups.get(key);
    if (!entry) {
      groups.set(key, { latest: tx, uses: 1 });
    } else {
      entry.uses += 1;
      if (tx.transaction_date > entry.latest.transaction_date) entry.latest = tx;
    }
  }

  return Array.from(groups.values())
    .sort((a, b) => b.uses - a.uses || b.latest.transaction_date.localeCompare(a.latest.transaction_date))
    .slice(0, limit)
    .map(({ latest, uses }) => ({
      description: latest.description,
      categoryId: latest.category_id,
      accountId: latest.account_id ?? null,
      creditCardId: latest.credit_card_id ?? null,
      paymentMethod: latest.payment_method ?? null,
      lastAmount: Number(latest.amount),
      uses,
    }));
}
