import type { Transaction, Category } from '../types/database';

export interface CategoryBreakdownItem {
  categoryId: string | null;
  categoryName: string;
  color: string;
  amount: number;
  percentage: number;
}

export interface MonthEvolutionItem {
  year: number;
  month: number;
  monthLabel: string;
  income: number;
  expense: number;
  net: number;
}

const MONTH_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

/**
 * Calcula a divisão percentual e total de gastos por categoria no mês,
 * desconsiderando pagamentos de fatura para prevenir dupla contagem.
 */
export function getCategoryExpensesBreakdown(
  transactions: Transaction[],
  categories: Category[]
): CategoryBreakdownItem[] {
  const expenseMap = new Map<string, number>();
  let totalExpense = 0;

  for (const t of transactions) {
    if (t.type === 'expense' && !t.is_invoice_payment) {
      const catKey = t.category_id || 'uncategorized';
      const current = expenseMap.get(catKey) || 0;
      const amount = Number(t.amount);
      expenseMap.set(catKey, current + amount);
      totalExpense += amount;
    }
  }

  if (totalExpense === 0) {
    return [];
  }

  const items: CategoryBreakdownItem[] = [];

  expenseMap.forEach((amount, catKey) => {
    let name = 'Sem Categoria';
    let color = '#64748B';

    if (catKey !== 'uncategorized') {
      const cat = categories.find((c) => c.id === catKey);
      if (cat) {
        name = cat.name;
        color = cat.color || '#3B82F6';
      }
    }

    const percentage = Math.round((amount / totalExpense) * 1000) / 10; // 1 casa decimal

    items.push({
      categoryId: catKey === 'uncategorized' ? null : catKey,
      categoryName: name,
      color,
      amount: Math.round(amount * 100) / 100,
      percentage,
    });
  });

  // Ordena da maior para a menor despesa
  return items.sort((a, b) => b.amount - a.amount);
}

/**
 * Gera a evolução dos últimos 6 meses com base na lista de transações.
 */
export function getSixMonthsEvolution(
  transactions: Transaction[],
  currentYear: number,
  currentMonth: number
): MonthEvolutionItem[] {
  const result: MonthEvolutionItem[] = [];

  // Gera os últimos 6 meses (do mais antigo para o atual)
  for (let i = 5; i >= 0; i--) {
    let targetMonth = currentMonth - i;
    let targetYear = currentYear;

    while (targetMonth <= 0) {
      targetMonth += 12;
      targetYear -= 1;
    }

    const monthStr = String(targetMonth).padStart(2, '0');
    const monthPrefix = `${targetYear}-${monthStr}`;

    let income = 0;
    let expense = 0;

    for (const t of transactions) {
      if (t.transaction_date.startsWith(monthPrefix)) {
        if (t.type === 'income') {
          income += Number(t.amount);
        } else if (t.type === 'expense' && !t.is_invoice_payment) {
          expense += Number(t.amount);
        }
      }
    }

    result.push({
      year: targetYear,
      month: targetMonth,
      monthLabel: `${MONTH_LABELS[targetMonth - 1]}/${String(targetYear).slice(2)}`,
      income: Math.round(income * 100) / 100,
      expense: Math.round(expense * 100) / 100,
      net: Math.round((income - expense) * 100) / 100,
    });
  }

  return result;
}

/**
 * Calcula a taxa de poupança percentual: (Receita - Despesa) / Receita * 100
 */
export function calculateSavingsRate(income: number, expense: number): number {
  if (income <= 0) return 0;
  const rate = ((income - expense) / income) * 100;
  return Math.max(0, Math.round(rate * 10) / 10);
}

/**
 * Filtra compromissos futuros (parcelas a vencer após o mês corrente)
 */
export function getUpcomingCommitments(transactions: Transaction[], referenceDateString: string): Transaction[] {
  return transactions
    .filter((t) => t.transaction_date > referenceDateString && t.type === 'expense')
    .sort((a, b) => a.transaction_date.localeCompare(b.transaction_date));
}
