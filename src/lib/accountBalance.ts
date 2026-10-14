/**
 * Saldo real das contas: saldo inicial + receitas pagas - despesas pagas.
 * Transferências não entram (não há conta de destino registrada).
 * Mesma regra da view `account_balances` do banco; usada como cálculo local (modo demonstração) e em testes.
 */
export interface BalanceAccount {
  id: string;
  initial_balance: number | string;
}

export interface BalanceTransaction {
  account_id: string | null;
  amount: number | string;
  type: string;
  is_paid: boolean;
}

export interface ReconciliationPlan {
  /** Diferença absoluta entre o saldo do banco e o do app */
  amount: number;
  /** 'income' quando falta uma entrada no app, 'expense' quando falta uma saída, null quando bate */
  type: 'income' | 'expense' | null;
}

/**
 * Compara o saldo do app com o do banco e indica o lançamento de ajuste necessário.
 */
export function planReconciliation(appBalance: number, bankBalance: number): ReconciliationPlan {
  const diffCents = Math.round(bankBalance * 100) - Math.round(appBalance * 100);
  if (diffCents === 0) return { amount: 0, type: null };
  return { amount: Math.abs(diffCents) / 100, type: diffCents > 0 ? 'income' : 'expense' };
}

export function computeAccountBalances(
  accounts: BalanceAccount[],
  transactions: BalanceTransaction[]
): Map<string, number> {
  const cents = new Map<string, number>();
  for (const account of accounts) {
    cents.set(account.id, Math.round(Number(account.initial_balance) * 100));
  }

  for (const tx of transactions) {
    if (!tx.is_paid || !tx.account_id || !cents.has(tx.account_id)) continue;
    const value = Math.round(Number(tx.amount) * 100);
    if (tx.type === 'income') cents.set(tx.account_id, cents.get(tx.account_id)! + value);
    else if (tx.type === 'expense') cents.set(tx.account_id, cents.get(tx.account_id)! - value);
  }

  const result = new Map<string, number>();
  for (const [id, value] of cents) result.set(id, value / 100);
  return result;
}
