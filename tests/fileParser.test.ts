import {
  detectDelimiter,
  parseCurrencyString,
  normalizeDateString,
  parseCSVContent,
} from '../src/lib/fileParser.ts';
import {
  suggestCategory,
  detectDuplicates,
} from '../src/lib/importMatching.ts';
import type { Category, Transaction } from '../src/types/database.ts';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`FALHA NO TESTE: ${message}`);
  }
  console.log(`✓ PASS: ${message}`);
}

console.log('=== Executando Testes Unitários de Importação e Parsing ===\n');

// 1. Delimitadores
assert(
  detectDelimiter('Data,Descricao,Valor\n2026-10-01,Padaria,15.50') === ',',
  'detectDelimiter identifica vírgula em CSV padrão'
);

assert(
  detectDelimiter('Data;Descricao;Valor\n01/10/2026;Supermercado;150,50') === ';',
  'detectDelimiter identifica ponto e vírgula em CSV brasileiro'
);

assert(
  detectDelimiter('Data\tDescricao\tValor\n01/10/2026\tSupermercado\t150,50') === '\t',
  'detectDelimiter identifica tabulação em TSV'
);

// 2. Conversão de Moeda
const brVal = parseCurrencyString('R$ 1.250,50');
assert(brVal.amount === 1250.5 && !brVal.isNegative, 'parseCurrencyString converte "R$ 1.250,50" corretamente');

const negVal = parseCurrencyString('-89,90');
assert(negVal.amount === 89.9 && negVal.isNegative, 'parseCurrencyString detecta valor negativo "-89,90"');

const usVal = parseCurrencyString('450.75');
assert(usVal.amount === 450.75 && !usVal.isNegative, 'parseCurrencyString converte valor em formato internacional 450.75');

// 3. Normalização de Datas
assert(
  normalizeDateString('15/10/2026') === '2026-10-15',
  'normalizeDateString converte formato brasileiro DD/MM/YYYY para ISO YYYY-MM-DD'
);

assert(
  normalizeDateString('2026-10-15') === '2026-10-15',
  'normalizeDateString preserva formato ISO YYYY-MM-DD'
);

// 4. Parsing de CSV Completo
const sampleCsv = `Data;Descricao;Valor
10/10/2026;Supermercado Extra;-230,40
11/10/2026;Salário Mensal;6500,00
12/10/2026;Posto Ipiranga Gasolina;-150,00`;

const parsedRows = parseCSVContent(sampleCsv);
assert(parsedRows.length === 3, 'parseCSVContent extrai as 3 linhas do CSV');
assert(parsedRows[0].normalizedDate === '2026-10-10', 'Linha 1 tem data normalizada correta');
assert(parsedRows[0].amount === 230.4 && parsedRows[0].type === 'expense', 'Linha 1 é despesa de 230.40');
assert(parsedRows[1].amount === 6500 && parsedRows[1].type === 'income', 'Linha 2 (Salário) é identificada como receita');

// 5. Sugestão Inteligente de Categoria
const mockCategories: Category[] = [
  { id: 'cat-alim', user_id: 'u1', name: 'Alimentação', type: 'expense', color: '#f00', icon: null, parent_id: null, is_active: true, created_at: '', updated_at: '' },
  { id: 'cat-transp', user_id: 'u1', name: 'Transporte', type: 'expense', color: '#ff0', icon: null, parent_id: null, is_active: true, created_at: '', updated_at: '' },
  { id: 'cat-saude', user_id: 'u1', name: 'Saúde', type: 'expense', color: '#0f0', icon: null, parent_id: null, is_active: true, created_at: '', updated_at: '' },
];

const catIfood = suggestCategory('Pagamento ifood *pedido', mockCategories);
assert(catIfood === 'cat-alim', 'suggestCategory vincula "ifood" à categoria de Alimentação');

const catUber = suggestCategory('Uber *trip 1234', mockCategories);
assert(catUber === 'cat-transp', 'suggestCategory vincula "uber" à categoria de Transporte');

const catDrogaria = suggestCategory('Drogasil Farmacia SP', mockCategories);
assert(catDrogaria === 'cat-saude', 'suggestCategory vincula "drogasil" à categoria de Saúde');

// 6. Prevenção de Duplicidades
const existingTxs: Transaction[] = [
  {
    id: 'tx-existing-1',
    user_id: 'u1',
    account_id: 'acc1',
    credit_card_id: null,
    category_id: 'cat-alim',
    import_batch_id: null,
    description: 'Supermercado Extra',
    amount: 230.40,
    type: 'expense',
    payment_method: 'debit',
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
];

const checkedRows = detectDuplicates(parsedRows, existingTxs);
assert(checkedRows[0].isDuplicate === true, 'Transação existente com mesma data e valor é marcada como duplicada');
assert(checkedRows[0].selected === false, 'Transação duplicada é desmarcada por padrão para proteger o usuário');
assert(checkedRows[1].isDuplicate === false, 'Transação inédita não é marcada como duplicada');
assert(checkedRows[1].selected === true, 'Transação inédita permanece selecionada');

console.log('\nTodos os 14 testes de importação e parsing passaram com sucesso!\n');
