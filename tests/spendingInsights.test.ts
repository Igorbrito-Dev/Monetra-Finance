import {
  computeMonthOutlook,
  compareCategoryMonths,
  categorySpendForMonth,
  detectAnomaly,
  detectSubscriptions,
  buildDescriptionSuggestions,
  type InsightTx,
} from '../src/lib/spendingInsights.ts';
import { ruleKeyFromDescription, matchCategoryRule } from '../src/lib/categoryRules.ts';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`FALHA NO TESTE: ${message}`);
  }
  console.log(`✓ PASS: ${message}`);
}

console.log('=== Executando Testes de Indicadores do Dia a Dia ===\n');

const mk = (over: Partial<InsightTx> & { transaction_date: string; amount: number }): InsightTx => ({
  description: 'Item',
  type: 'expense',
  is_paid: true,
  is_invoice_payment: false,
  category_id: null,
  ...over,
});

// Hoje = 10/10/2026 (outubro tem 31 dias: restam 21 dias depois de hoje, 22 contando hoje)
const today = '2026-10-10';
const txs: InsightTx[] = [
  mk({ transaction_date: '2026-10-02', amount: 100, category_id: 'alim' }),
  mk({ transaction_date: '2026-10-05', amount: 200, category_id: 'alim' }),
  mk({ transaction_date: '2026-10-08', amount: 300, category_id: 'lazer', installment_number: 1 }), // parcela: não é variável
  mk({ transaction_date: '2026-10-20', amount: 400, category_id: 'moradia', recurring_bill_id: 'b1' }), // agendado
  mk({ transaction_date: '2026-10-15', amount: 999, is_invoice_payment: true }), // pagamento de fatura: ignora
  mk({ transaction_date: '2026-10-01', amount: 5000, type: 'income' }),
  mk({ transaction_date: '2026-10-25', amount: 1000, type: 'income' }),
  mk({ transaction_date: '2026-09-20', amount: 50 }), // outro mês
];

const outlook = computeMonthOutlook(txs, today, 3000);
assert(outlook.spentToDate === 600, 'Gasto até hoje soma 100+200+300 (ignora pagamento de fatura e outro mês)');
assert(outlook.scheduledRemaining === 400, 'Agendado após hoje soma 400');
assert(outlook.variableAvgPerDay === 30, 'Média variável = (100+200)/10 dias = 30');
assert(outlook.projectedExpense === 600 + 400 + 30 * 21, 'Projeção = gasto + agendado + média × 21 dias restantes');
assert(outlook.projectedIncome === 6000, 'Receita projetada soma realizada e agendada');
assert(outlook.remainingDays === 22, 'Dias restantes contam hoje');
assert(outlook.budgetRemaining === 2000, 'Teto restante = 3000 - 600 - 400');
assert(outlook.dailyAllowance === Math.round((2000 / 22) * 100) / 100, 'Pode gastar por dia = restante / dias');

const noBudget = computeMonthOutlook(txs, today, 0);
assert(noBudget.dailyAllowance === null && noBudget.budgetRemaining === null, 'Sem teto: sem limite diário');
const over = computeMonthOutlook(txs, today, 500);
assert(over.dailyAllowance === 0, 'Teto estourado: limite diário 0 (nunca negativo)');

// Comparativo
const compare = compareCategoryMonths(
  [
    mk({ transaction_date: '2026-10-03', amount: 300, category_id: 'alim' }),
    mk({ transaction_date: '2026-09-02', amount: 200, category_id: 'alim' }),
    mk({ transaction_date: '2026-09-09', amount: 100, category_id: 'alim' }),
    mk({ transaction_date: '2026-09-25', amount: 900, category_id: 'alim' }), // depois do dia 10: fora da comparação
    mk({ transaction_date: '2026-10-04', amount: 80, category_id: 'lazer' }),
  ],
  today
);
const alim = compare.find((c) => c.categoryId === 'alim')!;
assert(alim.current === 300 && alim.previous === 300 && alim.deltaPct === 0, 'Compara mesmo intervalo do mês anterior (até o dia 10)');
assert(compare.find((c) => c.categoryId === 'lazer')!.deltaPct === null, 'Categoria nova no mês: variação indefinida');

const spend = categorySpendForMonth(txs, today);
assert(spend.get('alim') === 300 && spend.get('moradia') === 400, 'Gasto por categoria inclui o agendado do mês');

// Gasto atípico
assert(detectAnomaly(400, [100, 120, 90, 110]).isAnomaly === true, 'Gasto 4x a mediana é atípico');
assert(detectAnomaly(150, [100, 120, 90, 110]).isAnomaly === false, 'Gasto 1,4x não é atípico');
assert(detectAnomaly(400, [100, 120]).isAnomaly === false, 'Sem histórico suficiente não alerta');
assert(detectAnomaly(30, [5, 6, 5, 4]).isAnomaly === false, 'Diferença pequena em valor absoluto não alerta');

// Assinaturas
const subs = detectSubscriptions([
  mk({ description: 'Netflix', transaction_date: '2026-08-05', amount: 55.9 }),
  mk({ description: 'NETFLIX', transaction_date: '2026-09-05', amount: 55.9 }),
  mk({ description: 'Netflix', transaction_date: '2026-10-05', amount: 55.9 }),
  mk({ description: 'Mercado', transaction_date: '2026-08-05', amount: 120 }),
  mk({ description: 'Mercado', transaction_date: '2026-09-05', amount: 300 }),
  mk({ description: 'Mercado', transaction_date: '2026-10-05', amount: 80 }),
  mk({ description: 'Academia', transaction_date: '2026-09-01', amount: 99, recurring_bill_id: 'b1' }),
]);
assert(subs.length === 1 && subs[0].description === 'Netflix' && subs[0].months === 3, 'Detecta apenas a cobrança recorrente com valor estável');

// Sugestões de descrição
const sugg = buildDescriptionSuggestions(
  [
    mk({ description: 'Uber', transaction_date: '2026-10-01', amount: 20, category_id: 'transp', payment_method: 'pix', account_id: 'a1' }),
    mk({ description: 'Uber', transaction_date: '2026-10-05', amount: 25, category_id: 'transp', payment_method: 'credit', credit_card_id: 'c1' }),
    mk({ description: 'Padaria', transaction_date: '2026-10-03', amount: 12, category_id: 'alim' }),
    mk({ description: 'Parcela X (Parcela 2/5)', transaction_date: '2026-10-03', amount: 300, installment_number: 2 }),
  ],
  'ub'
);
assert(sugg.length === 1 && sugg[0].description === 'Uber' && sugg[0].uses === 2, 'Sugere por trecho digitado e conta os usos');
assert(sugg[0].creditCardId === 'c1' && sugg[0].paymentMethod === 'credit' && sugg[0].lastAmount === 25, 'Reaproveita cartão, forma e valor do uso mais recente');

// Regras de categoria
assert(ruleKeyFromDescription('Padaria Pão Quente 123') === 'padaria pao', 'Chave de aprendizado usa as 2 primeiras palavras');
assert(ruleKeyFromDescription('Pix de 99') === null, 'Descrição sem palavra significativa não gera regra');
const rules = [
  { keyword: 'padaria', category_id: 'alim' },
  { keyword: 'padaria pao', category_id: 'cafe' },
];
assert(matchCategoryRule('PADARIA PÃO QUENTE LTDA', rules) === 'cafe', 'Regra mais específica vence');
assert(matchCategoryRule('Padaria Central', rules) === 'alim', 'Regra genérica casa');
assert(matchCategoryRule('Posto Shell', rules) === null, 'Sem regra: nenhuma sugestão');

console.log('\n🎉 TODOS OS TESTES PASSARAM COM SUCESSO!');
