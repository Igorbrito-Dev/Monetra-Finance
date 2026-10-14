/**
 * Uso do limite do cartão: soma das compras de crédito que ainda não foram quitadas
 * (fatura em aberto, marcadas como pendentes) e das parcelas futuras.
 * Pagamentos de fatura não entram (são a quitação, não consumo).
 */
export interface CardUsageTransaction {
  credit_card_id: string | null;
  amount: number | string;
  type: string;
  is_paid: boolean;
  is_invoice_payment: boolean;
  transaction_date: string;
}

export function computeCardUsage(transactions: CardUsageTransaction[], today: string): Map<string, number> {
  const cents = new Map<string, number>();

  for (const tx of transactions) {
    if (!tx.credit_card_id || tx.type !== 'expense' || tx.is_invoice_payment) continue;
    const isOutstanding = !tx.is_paid || tx.transaction_date > today;
    if (!isOutstanding) continue;
    const value = Math.round(Number(tx.amount) * 100);
    cents.set(tx.credit_card_id, (cents.get(tx.credit_card_id) ?? 0) + value);
  }

  const result = new Map<string, number>();
  for (const [id, value] of cents) result.set(id, value / 100);
  return result;
}
