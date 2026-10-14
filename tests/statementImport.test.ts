import { parseCSVContent } from '../src/lib/fileParser.ts';
import { sheetRowsToCsv } from '../src/lib/spreadsheet.ts';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`FALHA NO TESTE: ${message}`);
  }
  console.log(`✓ PASS: ${message}`);
}

console.log('=== Executando Testes de Fatura (CSV/XLSX) ===\n');

// Fatura no formato do Nubank: date,category,title,amount
const nubank = [
  'date,category,title,amount',
  '2026-09-12,casa,Notebook Dell - Parcela 2/5,300.00',
  '2026-10-05,transporte,Uber,23.90',
  '2026-10-06,restaurante,Padaria Pao Quente,12.50',
  '2026-10-10,,Pagamento recebido,-900.00',
  '2026-10-11,casa,Estorno Loja X,-50.00',
].join('\n');

const card = parseCSVContent(nubank, { context: 'card' });
assert(card.length === 5, 'Lê as 5 linhas da fatura');

const notebook = card[0];
assert(
  notebook.kind === 'purchase' && notebook.installmentNumber === 2 && notebook.totalInstallments === 5 && notebook.baseDescription === 'Notebook Dell',
  'Compra parcelada: kind=purchase, parcela 2/5 e descrição-base'
);
assert(card[1].kind === 'purchase' && card[1].type === 'expense' && card[1].selected, 'Compra comum é despesa e vem marcada');
const payment = card.find((r) => r.description === 'Pagamento recebido')!;
assert(payment.kind === 'payment' && payment.selected === false, 'Pagamento da fatura vem desmarcado');
const refund = card.find((r) => r.description === 'Estorno Loja X')!;
assert(refund.kind === 'refund' && refund.type === 'income' && refund.selected === false && refund.amount === 50, 'Estorno vira crédito desmarcado');

// Mesmo arquivo como extrato de conta mantém a regra antiga (negativo = saída)
const asAccount = parseCSVContent(nubank, { context: 'account' });
assert(asAccount.find((r) => r.description === 'Uber')!.type === 'expense', 'Contexto conta mantém comportamento anterior');
assert(asAccount.every((r) => r.kind === undefined), 'Contexto conta não classifica pagamento/estorno');

// Planilha .xlsx convertida para CSV
const sheet = [
  ['Data', 'Descrição', 'Valor'],
  [new Date(Date.UTC(2026, 9, 5)), 'Salário Tech Corp', 5000],
  [new Date(Date.UTC(2026, 9, 6)), 'Mercado; Centro', -489.65],
  [null, null, null],
];
const csv = sheetRowsToCsv(sheet);
const fromSheet = parseCSVContent(csv);
assert(fromSheet.length === 2, 'Planilha: ignora linha vazia e lê 2 lançamentos');
assert(fromSheet[0].normalizedDate === '2026-10-05' && fromSheet[0].amount === 5000 && fromSheet[0].type === 'income', 'Planilha: data de célula, valor numérico e receita por palavra-chave');
assert(fromSheet[1].amount === 489.65 && fromSheet[1].type === 'expense' && fromSheet[1].description === 'Mercado Centro', 'Planilha: valor negativo é despesa e ";" na descrição é neutralizado');

console.log('\n🎉 TODOS OS TESTES PASSARAM COM SUCESSO!');
