import {
  getCategoryExpensesBreakdown,
  getSixMonthsEvolution,
  calculateSavingsRate,
  getUpcomingCommitments,
} from '../src/lib/dashboardMetrics.ts';
import type { Transaction, Category } from '../src/types/database.ts';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`FALHA NO TESTE: ${message}`);
  }
  console.log(`✓ PASS: ${message}`);
}

console.log('=== Executando Testes Unitários de Métricas do Dashboard ===\n');

const mockCategories: Category[] = [
  { id: 'cat-1', user_id: 'u-1', name: 'Alimentação', type: 'expense', color: '#EF4444', icon: null, parent_id: null, is_active: true, created_at: '', updated_at: '' },
  { id: 'cat-2', user_id: 'u-1', name: 'Transporte', type: 'expense', color: '#F59E0B', icon: null, parent_id: null, is_active: true, created_at: '', updated_at: '' },
];

const mockTransactions: Transaction[] = [
  {
    id: 't-1',
    user_id: 'u-1',
    account_id: 'a-1',
    credit_card_id: null,
    category_id: 'cat-1',
    import_batch_id: null,
    description: 'Mercado',
    amount: 600.0,
    type: 'expense',
    payment_method: 'debit',
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
    created_at: '',
    updated_at: '',
  },
  {
    id: 't-2',
    user_id: 'u-1',
    account_id: 'a-1',
    credit_card_id: null,
    category_id: 'cat-2',
    import_batch_id: null,
    description: 'Combustível',
    amount: 400.0,
    type: 'expense',
    payment_method: 'pix',
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
    created_at: '',
    updated_at: '',
  },
  {
    id: 't-3',
    user_id: 'u-1',
    account_id: 'a-1',
    credit_card_id: null,
    category_id: null,
    import_batch_id: null,
    description: 'Pagamento Fatura Cartão',
    amount: 1000.0,
    type: 'expense',
    payment_method: 'transfer',
    transaction_date: '2026-10-20',
    due_date: null,
    is_paid: true,
    is_recurrent: false,
    installment_number: null,
    total_installments: null,
    installment_group_id: null,
    is_invoice_payment: true, // Ignorar nas despesas de consumo!
    external_id: null,
    notes: null,
    created_at: '',
    updated_at: '',
  },
  {
    id: 't-4',
    user_id: 'u-1',
    account_id: null,
    credit_card_id: 'c-1',
    category_id: 'cat-1',
    import_batch_id: null,
    description: 'Compra Futura Novembro',
    amount: 300.0,
    type: 'expense',
    payment_method: 'credit',
    transaction_date: '2026-11-15',
    due_date: null,
    is_paid: false,
    is_recurrent: false,
    installment_number: 2,
    total_installments: 3,
    installment_group_id: 'g-1',
    is_invoice_payment: false,
    external_id: null,
    notes: null,
    created_at: '',
    updated_at: '',
  },
];

// Teste 1: Composição de categorias do mês corrente (600 de Alimentação + 400 de Transporte = 1000 total)
const currentMonthTransactions = mockTransactions.slice(0, 3);
const breakdown = getCategoryExpensesBreakdown(currentMonthTransactions, mockCategories);
assert(breakdown.length === 2, 'Deve agrupar em 2 categorias');
assert(breakdown[0].categoryName === 'Alimentação', 'Alimentação deve ser a maior despesa (60%)');
assert(breakdown[0].percentage === 60, 'Alimentação deve representar exatamente 60%');
assert(breakdown[1].categoryName === 'Transporte', 'Transporte deve ser a segunda maior despesa (40%)');
assert(breakdown[1].percentage === 40, 'Transporte deve representar exatamente 40%');

// Teste 2: Taxa de poupança (Receita 10.000, Despesa 4.000 -> 60%)
const savings = calculateSavingsRate(10000, 4000);
assert(savings === 60, 'Taxa de economia deve ser 60%');

// Teste 3: Evolução dos últimos 6 meses
const evolution = getSixMonthsEvolution(mockTransactions, 2026, 10);
assert(evolution.length === 6, 'Evolução deve retornar exatamente 6 meses');
assert(evolution[5].month === 10 && evolution[5].year === 2026, 'Último item da evolução deve ser o mês corrente');

// Teste 4: Compromissos futuros
const upcoming = getUpcomingCommitments(mockTransactions, '2026-10-31');
assert(upcoming.length === 1, 'Deve encontrar exatamente 1 compromisso futuro');
assert(upcoming[0].description === 'Compra Futura Novembro', 'Deve identificar a parcela de novembro');

console.log('\n🎉 TODOS OS TESTES DO DASHBOARD PASSARAM COM SUCESSO!');
