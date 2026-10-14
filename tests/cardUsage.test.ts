import { computeCardUsage } from '../src/lib/cardUsage.ts';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`FALHA NO TESTE: ${message}`);
  }
  console.log(`✓ PASS: ${message}`);
}

console.log('=== Executando Testes de Uso de Limite do Cartão ===\n');

const today = '2026-10-14';
const base = { type: 'expense', is_invoice_payment: false };

const usage = computeCardUsage(
  [
    { ...base, credit_card_id: 'c1', amount: 100, is_paid: false, transaction_date: '2026-10-10' },
    { ...base, credit_card_id: 'c1', amount: 40.5, is_paid: false, transaction_date: '2026-11-28' },
    { ...base, credit_card_id: 'c1', amount: 60, is_paid: true, transaction_date: '2026-12-28' },
    { ...base, credit_card_id: 'c1', amount: 999, is_paid: true, transaction_date: '2026-09-01' },
    { ...base, credit_card_id: 'c2', amount: 70, is_paid: false, transaction_date: '2026-10-01' },
    { ...base, is_invoice_payment: true, credit_card_id: 'c1', amount: 500, is_paid: false, transaction_date: '2026-10-05' },
    { type: 'income', is_invoice_payment: false, credit_card_id: 'c1', amount: 30, is_paid: false, transaction_date: '2026-10-06' },
    { ...base, credit_card_id: null, amount: 80, is_paid: false, transaction_date: '2026-10-06' },
  ],
  today
);

assert(usage.get('c1') === 200.5, 'c1: pendente 100 + parcela futura 40,50 + futura já marcada 60 = 200,50 (ignora paga passada)');
assert(usage.get('c2') === 70, 'c2: pendente de 70');
assert(usage.size === 2, 'Pagamento de fatura, receita e lançamento sem cartão não contam');

console.log('\n🎉 TODOS OS TESTES PASSARAM COM SUCESSO!');
