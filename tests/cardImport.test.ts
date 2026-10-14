import {
  detectInstallment,
  classifyCardNegative,
  addMonthsToIso,
  markCardDuplicates,
  buildCardImportRecords,
  type StatementRow,
} from '../src/lib/cardImport.ts';
import { parseOfxContent } from '../src/lib/ofxParser.ts';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`FALHA NO TESTE: ${message}`);
  }
  console.log(`✓ PASS: ${message}`);
}

console.log('=== Executando Testes de Importação de Fatura e OFX ===\n');

// --- Parcelas ---
let inst = detectInstallment('Notebook Dell - Parcela 2/5');
assert(!!inst && inst.number === 2 && inst.total === 5 && inst.baseDescription === 'Notebook Dell', 'Detecta "Parcela 2/5" e limpa a descrição');
inst = detectInstallment('MAGALU PARC 03/10');
assert(!!inst && inst.number === 3 && inst.total === 10 && inst.baseDescription === 'MAGALU', 'Detecta "PARC 03/10"');
inst = detectInstallment('Loja X parcela 1 de 3');
assert(!!inst && inst.number === 1 && inst.total === 3, 'Detecta "parcela 1 de 3"');
assert(detectInstallment('Uber 12/10') === null, 'Data solta na descrição não é parcela');
assert(detectInstallment('Algo parcela 7/5') === null, 'Parcela maior que o total é inválida');

// --- Pagamentos x estornos ---
assert(classifyCardNegative('Pagamento recebido') === 'payment', 'Pagamento recebido é pagamento de fatura');
assert(classifyCardNegative('Estorno Amazon') === 'refund', 'Estorno é crédito');
assert(classifyCardNegative('Crédito de "Mercado Livre"') === 'refund', 'Crédito é estorno');

// --- Datas ---
assert(addMonthsToIso('2026-11-28', 2) === '2027-01-28', 'Soma meses atravessando o ano');
assert(addMonthsToIso('2026-01-31', 1, 31) === '2026-02-28', 'Ajusta para o fim do mês');

// --- Duplicidades ---
const rows: StatementRow[] = [
  { normalizedDate: '2026-10-02', description: 'Notebook Dell - Parcela 2/5', amount: 300, type: 'expense', kind: 'purchase', installmentNumber: 2, totalInstallments: 5, baseDescription: 'Notebook Dell', selected: true },
  { normalizedDate: '2026-10-05', description: 'Uber', amount: 23.9, type: 'expense', kind: 'purchase', selected: true },
  { normalizedDate: '2026-10-06', description: 'Padaria', amount: 12, type: 'expense', kind: 'purchase', selected: true },
];
const existing = [
  { description: 'Notebook Dell (Parcela 2/5)', amount: 300, transaction_date: '2026-10-28', installment_number: 2, total_installments: 5 },
  { description: 'Uber', amount: 23.9, transaction_date: '2026-10-28', installment_number: null, total_installments: null },
];
const marked = markCardDuplicates(rows, existing, '2026-10-28');
assert(marked[0].isDuplicate === true && marked[0].selected === false, 'Parcela já registrada é marcada como duplicada');
assert(marked[1].isDuplicate === true, 'Mesma descrição, valor e fatura é duplicada');
assert(!marked[2].isDuplicate && marked[2].selected === true, 'Compra nova não é duplicada');

// --- Geração dos registros ---
let counter = 0;
const records = buildCardImportRecords(
  [
    { normalizedDate: '2026-09-02', description: 'Notebook Dell - Parcela 2/4', amount: 300, type: 'expense', kind: 'purchase', installmentNumber: 2, totalInstallments: 4, baseDescription: 'Notebook Dell', selected: true },
    { normalizedDate: '2026-10-05', description: 'Uber', amount: 23.9, type: 'expense', kind: 'purchase', selected: true },
    { normalizedDate: '2026-10-10', description: 'Pagamento recebido', amount: 900, type: 'expense', kind: 'payment', selected: false },
    { normalizedDate: '2026-10-11', description: 'Estorno Loja', amount: 50, type: 'income', kind: 'refund', selected: true },
  ],
  { invoiceDueDate: '2026-10-28', dueDay: 28, createFutureInstallments: true, makeId: () => `g${++counter}` }
);

const installmentRecords = records.filter((r) => r.installment_group_id);
assert(installmentRecords.length === 3, 'Parcela 2/4 gera a atual e as futuras 3/4 e 4/4');
assert(installmentRecords[0].transaction_date === '2026-10-28' && installmentRecords[1].transaction_date === '2026-11-28' && installmentRecords[2].transaction_date === '2026-12-28', 'Parcelas futuras caem nos meses seguintes');
assert(installmentRecords.every((r) => r.installment_group_id === 'g1'), 'Parcelas compartilham o mesmo grupo');
assert(installmentRecords[0].description === 'Notebook Dell (Parcela 2/4)', 'Descrição padronizada com parcela');
const uber = records.find((r) => r.description === 'Uber')!;
assert(uber.is_paid === false && uber.transaction_date === '2026-10-28' && uber.notes === 'Compra em 05/10/2026', 'Compra comum entra na fatura, pendente, com data da compra na nota');
assert(!records.some((r) => r.is_invoice_payment), 'Pagamento desmarcado não é importado');
const refund = records.find((r) => r.description === 'Estorno Loja')!;
assert(refund.type === 'income', 'Estorno selecionado entra como crédito');

const noFuture = buildCardImportRecords([rows[0]], { invoiceDueDate: '2026-10-28', dueDay: 28, createFutureInstallments: false, makeId: () => 'x' });
assert(noFuture.length === 1, 'Sem criar parcelas futuras, grava apenas a parcela da fatura');

// --- OFX ---
const ofx = `OFXHEADER:100
DATA:OFXSGML
<OFX><BANKMSGSRSV1><STMTTRNRS><STMTRS><BANKTRANLIST>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20261005120000[-3:BRT]
<TRNAMT>-489,65
<FITID>2026100501
<MEMO>Supermercado Pão de Açúcar
</STMTTRN>
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20261008
<TRNAMT>150.00
<FITID>2026100802
<NAME>Pix recebido Maria
</STMTTRN>
</BANKTRANLIST></STMTRS></STMTTRNRS></BANKMSGSRSV1></OFX>`;
const parsedOfx = parseOfxContent(ofx);
assert(parsedOfx.length === 2, 'OFX: lê duas transações');
assert(parsedOfx[0].date === '2026-10-05' && parsedOfx[0].amount === -489.65 && parsedOfx[0].fitId === '2026100501', 'OFX: data, valor com vírgula e FITID');
assert(parsedOfx[1].description === 'Pix recebido Maria' && parsedOfx[1].amount === 150, 'OFX: usa NAME quando não há MEMO');
assert(parseOfxContent('texto qualquer').length === 0, 'OFX: conteúdo inválido retorna vazio');

console.log('\n🎉 TODOS OS TESTES PASSARAM COM SUCESSO!');
