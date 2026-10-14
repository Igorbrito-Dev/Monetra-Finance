/**
 * Agrupamento de lançamentos de cartão em faturas (por cartão + vencimento).
 * Pagamentos de fatura não entram: eles são a quitação, não consumo.
 */
import { getBillStatus, type BillStatus } from './billRules.ts';

export interface InvoiceTransaction {
  id: string;
  credit_card_id: string | null;
  description: string;
  amount: number | string;
  type: string;
  is_paid: boolean;
  is_invoice_payment: boolean;
  due_date: string | null;
  transaction_date: string;
  installment_number?: number | null;
  total_installments?: number | null;
  notes?: string | null;
}

export interface Invoice<T extends InvoiceTransaction = InvoiceTransaction> {
  key: string;
  cardId: string;
  dueDate: string;
  total: number;
  /** Valor ainda não quitado */
  outstanding: number;
  isPaid: boolean;
  status: BillStatus;
  items: T[];
}

export function groupInvoices<T extends InvoiceTransaction>(transactions: T[], today: string): Invoice<T>[] {
  const map = new Map<string, { cardId: string; dueDate: string; items: T[] }>();

  for (const tx of transactions) {
    if (!tx.credit_card_id || tx.type !== 'expense' || tx.is_invoice_payment) continue;
    const dueDate = tx.due_date ?? tx.transaction_date;
    const key = `${tx.credit_card_id}|${dueDate}`;
    const entry = map.get(key) ?? { cardId: tx.credit_card_id, dueDate, items: [] as T[] };
    entry.items.push(tx);
    map.set(key, entry);
  }

  const invoices: Invoice<T>[] = [];
  for (const [key, entry] of map) {
    const totalCents = entry.items.reduce((sum, t) => sum + Math.round(Number(t.amount) * 100), 0);
    const outstandingCents = entry.items
      .filter((t) => !t.is_paid)
      .reduce((sum, t) => sum + Math.round(Number(t.amount) * 100), 0);
    const isPaid = outstandingCents === 0;

    invoices.push({
      key,
      cardId: entry.cardId,
      dueDate: entry.dueDate,
      total: totalCents / 100,
      outstanding: outstandingCents / 100,
      isPaid,
      status: getBillStatus(entry.dueDate, isPaid, today),
      items: entry.items.slice().sort((a, b) => a.transaction_date.localeCompare(b.transaction_date)),
    });
  }

  return invoices.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}
