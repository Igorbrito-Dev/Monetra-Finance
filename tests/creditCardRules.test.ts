import {
  getInvoiceForPurchase,
  generateCardInstallmentSchedule,
  formatIsoDateBR,
} from '../src/lib/creditCardRules.ts';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`FALHA NO TESTE: ${message}`);
  }
  console.log(`✓ PASS: ${message}`);
}

console.log('=== Executando Testes de Regras de Cartão de Crédito ===\n');

// Cartão fecha dia 20 e vence dia 28
let inv = getInvoiceForPurchase('2026-10-10', 20, 28);
assert(inv.closingDate === '2026-10-20' && inv.dueDate === '2026-10-28', 'Compra antes do fechamento cai na fatura atual (vence 28/10)');

inv = getInvoiceForPurchase('2026-10-20', 20, 28);
assert(inv.closingDate === '2026-11-20' && inv.dueDate === '2026-11-28', 'Compra NO dia do fechamento cai na próxima fatura (vence 28/11)');

inv = getInvoiceForPurchase('2026-10-25', 20, 28);
assert(inv.dueDate === '2026-11-28', 'Compra depois do fechamento cai na próxima fatura');

// Vencimento antes do fechamento no calendário (fecha 25, vence 5): vence no mês seguinte ao fechamento
inv = getInvoiceForPurchase('2026-10-10', 25, 5);
assert(inv.closingDate === '2026-10-25' && inv.dueDate === '2026-11-05', 'Fecha 25/10 e vence 05/11 quando vencimento < fechamento');

inv = getInvoiceForPurchase('2026-10-26', 25, 5);
assert(inv.closingDate === '2026-11-25' && inv.dueDate === '2026-12-05', 'Após fechar dia 25, fatura seguinte vence 05/12');

// Virada de ano
inv = getInvoiceForPurchase('2026-12-22', 20, 28);
assert(inv.closingDate === '2027-01-20' && inv.dueDate === '2027-01-28', 'Compra em dezembro após o fechamento vence em janeiro do ano seguinte');

// Dia 31 em fevereiro (ajuste para o último dia do mês)
inv = getInvoiceForPurchase('2027-02-10', 31, 10);
assert(inv.closingDate === '2027-02-28', 'Fechamento dia 31 em fevereiro é ajustado para 28');
inv = getInvoiceForPurchase('2027-02-28', 31, 10);
assert(inv.closingDate === '2027-03-31', 'Compra no último dia de fevereiro (dia de fechamento efetivo) cai na próxima fatura');

// Cronograma de 5 parcelas começando após o fechamento
const schedule = generateCardInstallmentSchedule('2026-10-25', 20, 28, 5);
assert(schedule.length === 5, 'Gera exatamente 5 vencimentos');
assert(schedule[0].dueDate === '2026-11-28', '1ª parcela vence na próxima fatura (28/11)');
assert(schedule[4].dueDate === '2027-03-28', '5ª parcela vence em março do ano seguinte');

// Cronograma antes do fechamento
const scheduleBefore = generateCardInstallmentSchedule('2026-10-05', 20, 28, 3);
assert(scheduleBefore[0].dueDate === '2026-10-28', '1ª parcela cai nesta fatura quando comprou antes do fechamento');
assert(scheduleBefore[2].dueDate === '2026-12-28', '3ª parcela vence em dezembro');

assert(formatIsoDateBR('2026-11-28') === '28/11/2026', 'Formata data em padrão brasileiro');

console.log('\n🎉 TODOS OS TESTES PASSARAM COM SUCESSO!');
