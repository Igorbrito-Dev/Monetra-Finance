import { computeAccountBalances, planReconciliation } from '../src/lib/accountBalance.ts';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`FALHA NO TESTE: ${message}`);
  }
  console.log(`✓ PASS: ${message}`);
}

console.log('=== Executando Testes de Saldo de Contas ===\n');

const accounts = [
  { id: 'a1', initial_balance: 1000 },
  { id: 'a2', initial_balance: '250.50' },
];

const txs = [
  { account_id: 'a1', amount: 500, type: 'income', is_paid: true },
  { account_id: 'a1', amount: 120.35, type: 'expense', is_paid: true },
  { account_id: 'a1', amount: 300, type: 'expense', is_paid: false },
  { account_id: 'a1', amount: 80, type: 'transfer', is_paid: true },
  { account_id: null, amount: 999, type: 'expense', is_paid: true },
  { account_id: 'a2', amount: 50.5, type: 'expense', is_paid: true },
  { account_id: 'zzz', amount: 10, type: 'income', is_paid: true },
];

const balances = computeAccountBalances(accounts, txs);

assert(balances.get('a1') === 1379.65, 'Conta a1: 1000 + 500 - 120,35 = 1379,65 (ignora pendente e transferência)');
assert(balances.get('a2') === 200, 'Conta a2: 250,50 - 50,50 = 200 (aceita saldo inicial como texto)');
assert(balances.size === 2, 'Transações sem conta ou de conta desconhecida não criam saldo');

console.log('\n🎉 TODOS OS TESTES PASSARAM COM SUCESSO!');
