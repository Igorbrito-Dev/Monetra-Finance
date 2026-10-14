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
