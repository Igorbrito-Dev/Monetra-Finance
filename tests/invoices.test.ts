import { groupInvoices } from '../src/lib/invoices.ts';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`FALHA NO TESTE: ${message}`);
  }
  console.log(`✓ PASS: ${message}`);
}

console.log('=== Executando Testes de Faturas ===\n');

const base = { type: 'expense', is_invoice_payment: false, transaction_date: '2026-10-01' };
const txs = [
  { ...base, id: '1', credit_card_id: 'c1', description: 'A', amount: 100, is_paid: false, due_date: '2026-10-28' },
  { ...base, id: '2', credit_card_id: 'c1', description: 'B', amount: 50.25, is_paid: false, due_date: '2026-10-28' },
  { ...base, id: '3', credit_card_id: 'c1', description: 'C', amount: 30, is_paid: false, due_date: '2026-11-28' },
  { ...base, id: '4', credit_card_id: 'c2', description: 'D', amount: 80, is_paid: true, due_date: '2026-10-12' },
  { ...base, id: '5', credit_card_id: 'c2', description: 'E', amount: 20, is_paid: false, due_date: '2026-10-12' },
  { ...base, id: '6', credit_card_id: 'c1', description: 'Pagamento', amount: 999, is_paid: true, is_invoice_payment: true, due_date: null },
  { ...base, id: '7', credit_card_id: null, description: 'Sem cartão', amount: 10, is_paid: false, due_date: '2026-10-28' },
  { ...base, id: '8', credit_card_id: 'c3', description: 'Quitada', amount: 40, is_paid: true, due_date: '2026-09-28' },
  { ...base, id: '9', credit_card_id: 'c1', description: 'Sem vencimento', amount: 15, is_paid: false, due_date: null, transaction_date: '2026-10-20' },
];

const invoices = groupInvoices(txs, '2026-10-14');
const find = (card: string, due: string) => invoices.find((i) => i.cardId === card && i.dueDate === due)!;

assert(invoices.length === 5, 'Agrupa por cartão + vencimento e ignora pagamento de fatura e lançamento sem cartão');
assert(find('c1', '2026-10-28').total === 150.25 && find('c1', '2026-10-28').items.length === 2, 'Soma os itens da mesma fatura');
assert(find('c1', '2026-10-28').status === 'upcoming', 'Fatura futura em aberto: a vencer');
assert(find('c2', '2026-10-12').status === 'overdue' && find('c2', '2026-10-12').outstanding === 20, 'Fatura vencida com saldo em aberto: atrasada');
assert(find('c2', '2026-10-12').total === 100, 'Total considera itens pagos e pendentes');
assert(find('c3', '2026-09-28').isPaid && find('c3', '2026-09-28').status === 'paid', 'Fatura toda paga: status pago');
assert(find('c1', '2026-10-20').dueDate === '2026-10-20', 'Sem due_date usa a data do lançamento');
assert(invoices[0].dueDate <= invoices[invoices.length - 1].dueDate, 'Ordena por vencimento');

console.log('\n🎉 TODOS OS TESTES PASSARAM COM SUCESSO!');
