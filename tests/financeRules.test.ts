import { splitInstallmentAmounts, generateInstallmentDates, calculateMonthSummary } from '../src/lib/financeRules.ts';
import type { Transaction } from '../src/types/database.ts';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`FALHA NO TESTE: ${message}`);
  }
  console.log(`✓ PASS: ${message}`);
}

console.log('=== Executando Testes Unitários de Regras Financeiras ===\n');

// Teste 1: Divisão de parcelas sem perda de centavos (R$ 100 em 3x)
const installments100in3 = splitInstallmentAmounts(100.0, 3);
assert(
  installments100in3.length === 3,
  'Deve gerar exatamente 3 parcelas'
);
assert(
  installments100in3[0] === 33.34 && installments100in3[1] === 33.33 && installments100in3[2] === 33.33,
  'Parcelas de R$ 100 em 3x devem ser 33.34, 33.33 e 33.33'
);
const sum100 = Math.round(installments100in3.reduce((a, b) => a + b, 0) * 100) / 100;
assert(sum100 === 100.0, 'Soma das parcelas de 100 em 3x deve ser exatamente 100.00');

// Teste 2: Divisão de R$ 50 em 7 parcelas
const installments50in7 = splitInstallmentAmounts(50.0, 7);
const sum50 = Math.round(installments50in7.reduce((a, b) => a + b, 0) * 100) / 100;
assert(sum50 === 50.0, 'Soma das parcelas de R$ 50 em 7x deve bater exatamente 50.00');

// Teste 3: Geração de datas mensais com tratamento de fim de mês
const datesFromJan31 = generateInstallmentDates('2026-01-31', 3);
assert(
  datesFromJan31[0] === '2026-01-31' &&
  datesFromJan31[1] === '2026-02-28' &&
  datesFromJan31[2] === '2026-03-31',
  'Datas a partir de 31/jan devem ajustar fevereiro para 28/fev e março para 31/mar'
);

// Teste 4: Prevenção de Dupla Contagem no Pagamento de Fatura
const mockTransactions: Transaction[] = [
  {
    id: 'tx-1',
    user_id: 'user-1',
    account_id: 'acc-1',
    credit_card_id: null,
    category_id: 'cat-1',
    import_batch_id: null,
    description: 'Salário',
    amount: 5000.0,
    type: 'income',
    payment_method: 'transfer',
    transaction_date: '2026-10-05',
    due_date: null,
    is_paid: true,
    is_recurrent: false,
    installment_number: null,
    total_installments: null,
    installment_group_id: null,
    is_invoice_payment: false,
    external_id: null,
    notes: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'tx-2',
    user_id: 'user-1',
    account_id: null,
    credit_card_id: 'card-1',
    category_id: 'cat-2',
    import_batch_id: null,
    description: 'Jantar Restaurante',
    amount: 150.0,
    type: 'expense',
    payment_method: 'credit',
    transaction_date: '2026-10-10',
    due_date: null,
    is_paid: true,
    is_recurrent: false,
    installment_number: null,
    total_installments: null,
    installment_group_id: null,
    is_invoice_payment: false,
    external_id: null,
    notes: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'tx-3',
    user_id: 'user-1',
    account_id: 'acc-1',
    credit_card_id: 'card-1',
    category_id: null,
    import_batch_id: null,
    description: 'Pagamento de Fatura do Cartão',
    amount: 150.0,
    type: 'expense',
    payment_method: 'transfer',
    transaction_date: '2026-10-25',
    due_date: null,
    is_paid: true,
    is_recurrent: false,
    installment_number: null,
    total_installments: null,
    installment_group_id: null,
    is_invoice_payment: true, // PAGAMENTO DE FATURA NÃO DEVE ENTRAR COMO DESPESA DE CONSUMO
    external_id: null,
    notes: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const summary = calculateMonthSummary(mockTransactions);
assert(summary.totalIncome === 5000.0, 'Receita total deve ser R$ 5.000,00');
assert(
  summary.totalExpense === 150.0,
  'Despesa total deve ser apenas os 150 do restaurante, sem somar outros 150 do pagamento de fatura (Prevenção de Dupla Contagem)'
);
assert(summary.netBalance === 4850.0, 'Saldo líquido deve ser 5000 - 150 = 4850.00');

console.log('\n🎉 TODOS OS TESTES PASSARAM COM SUCESSO!');
