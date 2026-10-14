import { getBillStatus, buildRecurringOccurrences, getReminderKind, diffInDays } from '../src/lib/billRules.ts';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`FALHA NO TESTE: ${message}`);
  }
  console.log(`✓ PASS: ${message}`);
}

console.log('=== Executando Testes de Regras de Contas a Pagar ===\n');

const today = '2026-10-14';

// Status
assert(getBillStatus('2026-10-10', true, today) === 'paid', 'Conta paga é sempre verde (paid), mesmo vencida');
assert(getBillStatus('2026-10-14', false, today) === 'due_today', 'Vence hoje fica amarela (due_today)');
assert(getBillStatus('2026-10-13', false, today) === 'overdue', 'Venceu ontem sem pagar fica vermelha (overdue)');
assert(getBillStatus('2026-10-20', false, today) === 'upcoming', 'Vencimento futuro é upcoming');

// Diferença de dias
assert(diffInDays('2026-10-14', '2026-10-15') === 1, 'Diferença de 1 dia');
assert(diffInDays('2026-12-31', '2027-01-02') === 2, 'Diferença atravessando o ano');

// Ocorrências
const bill = { day_of_month: 31, start_date: '2026-01-01', end_date: null, active: true };
const occ = buildRecurringOccurrences(bill, '2026-01-15', 1);
assert(occ.length === 2 && occ[0] === '2026-01-31' && occ[1] === '2026-02-28', 'Dia 31 vira 28 em fevereiro');

const occYear = buildRecurringOccurrences({ ...bill, day_of_month: 5 }, '2026-12-10', 1);
assert(occYear[1] === '2027-01-05', 'Mês seguinte atravessa a virada do ano');

const occEnded = buildRecurringOccurrences({ ...bill, day_of_month: 5, end_date: '2026-10-31' }, '2026-10-10', 1);
assert(occEnded.length === 1 && occEnded[0] === '2026-10-05', 'Respeita data final da conta fixa');

const occInactive = buildRecurringOccurrences({ ...bill, active: false }, '2026-10-10', 1);
assert(occInactive.length === 0, 'Conta inativa não gera ocorrências');

const occNotStarted = buildRecurringOccurrences({ ...bill, day_of_month: 5, start_date: '2026-11-01' }, '2026-10-10', 1);
assert(occNotStarted.length === 1 && occNotStarted[0] === '2026-11-05', 'Não gera ocorrências antes da data inicial');

// Lembretes
assert(getReminderKind('2026-10-15', false, today, 1) === 'before', 'Avisa 1 dia antes');
assert(getReminderKind('2026-10-16', false, today, 1) === null, 'Não avisa 2 dias antes quando configurado para 1');
assert(getReminderKind('2026-10-16', false, today, 2) === 'before', 'Avisa 2 dias antes quando configurado para 2');
assert(getReminderKind('2026-10-14', false, today, 1) === 'today', 'Avisa no dia do vencimento');
assert(getReminderKind('2026-10-10', false, today, 1) === 'overdue', 'Avisa conta atrasada');
assert(getReminderKind('2026-10-15', true, today, 1) === null, 'Conta paga não gera lembrete');

console.log('\n🎉 TODOS OS TESTES PASSARAM COM SUCESSO!');
